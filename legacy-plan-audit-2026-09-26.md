# Legacy Plan Compatibility Audit

Date: 2026-09-26

## Scope And Method

- Examined 40 YAML/JSON files directly in `C:\Users\Hassan\Documents\plans`. No subfolders were scanned. Non-plan files were excluded.
- Used the current LPS loader, DTO property definitions, and validators. All 31 YAML originals passed these checks with no unknown properties. All nine JSON files failed loading.
- Executed bounded copies of all 31 YAML plans using their **original URLs, base URLs, methods, headers, payloads, captures, and protocol settings**. Earlier echo-relay results are excluded from this report.
- Originals were not edited. SHA-256 hashes of all 40 files still match the initial audit.
- Smoke limits: one client, sequential execution, zero startup/arrival delays, only the first stage, one request in R mode, two requests in CRB mode, and one second in D/DCB modes. Infinite CB runs were bounded as CRB. Retry attempts were capped at one retry, retry delays shortened, and response saving disabled. Relative `$read` paths were resolved against the original plans directory in the temporary copies.
- Per-run settings disabled Influx export, used isolated local dashboard/gRPC ports, and set a 12-second client timeout. A run had a 60-second cancellation limit and an 85-second forced-stop limit. No run reached either limit.
- All 31 processes exited with code zero and persisted final metrics. Those metrics reported 65 measured requests; this is not an accounting of extra warm-up, capture, or retry traffic.
- This is **compatibility and bounded smoke validation**, not validation of the original million-request workloads, client counts, complete stage schedules, or every retry/conditional branch.

## Summary

| Finding | Plans |
| --- | ---: |
| JSON files incompatible with the current schema | 9 |
| YAML files with HTTP, DNS, capture, or expression issues | 9 |
| YAML files with expected conditional skips | 4 |
| Other YAML files whose HTTP requests succeeded but logged gRPC warnings | 3 |
| Remaining YAML files with successful smoke requests | 15 |
| Total files checked | 40 |

Do not equate exit code zero or iteration status `Success` with successful HTTP requests. Some plans reported successful throughput despite HTTP errors or DNS failures. The findings below also inspect response-code snapshots and logs.

## Incompatible JSON Files

All nine fail with `The JSON value could not be converted to System.Guid` at `$.id`. They also contain obsolete root structures rather than current `rounds` and `iterations`.

| File | Obsolete root structure |
| --- | --- |
| `dfdfdf.json` | `lpsHttpRuns` |
| `Example.json` | `lpsHttpRuns` |
| `Hello-Haidar.json` | `lpsRuns` |
| `Hello-LPS.json` | `lpsRuns` |
| `Hello-Test.json` | `lpsHttpRuns` |
| `kdjfkdjfkdj.json` | `lpsHttpRuns` |
| `login-test-plan-01.json` | `lpsHttpRuns` |
| `StressTest-01.json` | `lpsHttpRuns` |
| `urnice.json` | `lpsRuns` |

Other unrecognized root properties in these files: `numberOfClients`, `rampUpPeriod`, `delayClientCreationUntilIsNeeded`, `runInParallel`, `isValid`, and `validationErrors`. Some of these concepts still exist at other levels; their presence at the old root location is not supported. Fixing only the GUID would not migrate these plans. They were flagged, not converted or sent to their targets.

## YAML Results

Every file below passed the original schema/validator checks. `Issue` means an observed runtime problem, not an obsolete DTO property. `Conditional` means a branch was deliberately skipped and its request was therefore not tested.

| File | Result | Observation |
| --- | --- | --- |
| `1m.yaml` | Issue | `Warm` returned 200. `fetch-data` recorded DNS failures, although throughput reported success; this is not a clean pass. |
| `1millionrequest.yaml` | OK | Capped request returned 200. The million-request workload was not run. |
| `allinone.yaml` | Issue | `FetchToken` returned 405. JSON capture failed and dependent iterations were skipped. |
| `allinoneexample.yaml` | Issue | `FetchToken` returned 405 despite plan-defined success. JSON capture failed and dependent iterations were skipped. |
| `app.yaml` | Warning | Request returned 200; gRPC connection exceptions were logged. No obsolete property was identified. |
| `breakthesystem.yaml` | OK | Both capped iterations returned 200. |
| `capture.yaml` | Conditional | User request returned 200. The subsequent `$startswith` skip condition matched; that request was not sent. |
| `contains.yaml` | Conditional | User request returned 200. The subsequent lowercase/contains skip condition matched; that request was not sent. |
| `find.yaml` | Conditional | `getUsers` returned 200. `useMatchedUser` was skipped by its condition. |
| `food.yaml` | OK | All three capped iterations returned 200. |
| `food2.yaml` | OK | All five capped iterations returned 200. |
| `food3.yaml` | Warning | All five capped iterations returned 200; gRPC connection exceptions were logged. |
| `fshopping.yaml` | OK | Four capped iterations returned 200/201. |
| `fshoppingexample.yaml` | OK | Four capped iterations returned 200/201. |
| `IterationLevelSkipIf.yaml` | Issue | `Home.skipIf` references `${LoginResponse.StatusCode}`. `LoginResponse` was unresolved and expression compilation failed. Both requests returning 200 does not validate that condition. |
| `login.yaml` | OK | Request returned 200. This does not independently prove a usable authenticated session/token was obtained. |
| `loginform.yaml` | Conditional | URL-encoded login returned 200. Multipart example has `skipIf: 1 = 1` and was skipped; a DNS exception was also logged. |
| `naturalhumanvisti.yaml` | OK | Both capped iterations returned 200. |
| `onetest.yaml` | OK | Both capped iterations returned 200. |
| `openai.yaml` | OK | Capped request returned 200. |
| `r.yaml` | Issue | Login target had a DNS failure; profile request returned 200. |
| `rampupstages.yaml` | Warning | Capped duration request returned 200; gRPC connection exceptions were logged. Only the first stage was exercised. |
| `realusersimulation.yaml` | OK | Both capped iterations returned 200. |
| `retry.yaml` | OK | Request returned 200; the error-triggered retry path was not exercised. |
| `servertiming.yaml` | Issue | `FetchToken` returned 404; JSON capture failed and dependent iterations were skipped. |
| `ShoppingCart.yaml` | Issue | Both iterations recorded DNS failures. An unresolved-variable warning was also logged. |
| `skipif.yaml` | Issue | Login iteration returned 404; Home returned 200. |
| `skipoftest.yaml` | OK | Both capped iterations returned 200. |
| `test.yaml` | Issue | `GetUsers` recorded a DNS failure. |
| `twotest.yaml` | OK | Both capped iterations returned 200. |
| `wave.yaml` | OK | Bounded DCB run recorded four responses with status 200. |

## Follow-Up Flags

1. Migrate the nine legacy JSON structures and supply valid GUIDs before expecting them to run with the current version.
2. Review the failing original endpoints and response expectations in the eight HTTP/DNS-affected YAML plans. A reachable page with HTTP 200 is not necessarily a working login or correct application response.
3. Review capture definition, reference, and evaluation timing for `LoginResponse` in `IterationLevelSkipIf.yaml`. The unresolved expression is a runtime failure even though request execution continued.
4. Keep the three gRPC-warning cases separate from plan-schema failures. Their HTTP smoke requests completed, but the logs were not clean.
5. Conditional, retry, full-load, and later-stage paths not exercised by these bounded runs remain unverified.

## Local Artifacts

Machine-readable audit and final run results are under:

```text
%LOCALAPPDATA%\Temp\lps-workspace-verification\legacy-plan-audit\results
  original-url-compatibility.json
  original-url-smoke-results.json
  original-url-smoke-plans\
  original-url-runs\<source-file>\
```

The per-run folders contain final metrics and console/engine logs. Temporary plans and raw logs may contain original credentials or payloads; do not publish them without redaction. This report contains no credentials or payload contents.
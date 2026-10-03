# Distributed Workers: Test Guide

**Start here:** use the four-terminal walkthrough below. One run sends **20 planned requests**, then leaves both worker agents waiting for another run.

**Testing across machines?** Jump to [Multi-Machine Commands](#multi-machine-commands), including both the new persistent workflow and legacy commands.

These commands require the implementation in this source checkout. They are not a claim that an already-published NuGet package contains it.

## What Changed

| Responsibility | Process |
| --- | --- |
| Coordinate a run, wait for readiness, aggregate metrics | Dedicated master child |
| Register, reconnect, accept one assignment, supervise execution | Persistent worker agent |
| Prepare and execute one plan, retain metrics until release, then exit | Fresh worker child per run |

By default the new master only coordinates. With `LPSAppSettings.Cluster.MasterNodeIsWorker: true`, it also owns a local worker agent and a fresh executor child. Coordination stays separate from load generation. Each executor runs the **whole plan**: request/client counts are per worker, not divided across workers.

New commands:

```text
lps worker --master <endpoint> --name <unique-name> [--listen <worker-endpoint>]
lps master <plan> --workers <count> --listen <master-endpoint>
```

Existing standalone commands remain available. The new master mode is selected by `--workers`, `--listen`, `--settings`, or `--masternodeisworker` (`-miw`). Bare `lps master <plan>` retains the legacy route. New hosted lifecycles bypass the legacy role-branching orchestrator. Shared HTTP execution and metrics services are reused.

## Before You Start

- Windows PowerShell, .NET SDK 8 or newer, and Node.js for the tiny local target.
- Open terminals at the **LPS source repository root**. The documentation checkout must be under `lps-docs`.
- Keep ports **8119, 5161, 5162, 5163** free. Do not stop another application's listener to free them; choose other ports and update the commands/plan instead.
- The demo binds only loopback. It does not contact an external load-test target.

## 1. Prepare Once

Run this in any terminal. Binaries and artifacts go outside the checkout, so running UI binaries are not overwritten.

```powershell
$lab = Join-Path $env:LOCALAPPDATA 'LPS\DistributedDemo'
New-Item -ItemType Directory -Path $lab -Force | Out-Null
dotnet publish .\LPS\LPS.csproj -c Debug --artifacts-path "$lab/build" -o "$lab/app" --tl:off --verbosity quiet
```

**Check:** the build succeeds before continuing.

Use this dedicated application folder, not the test output folder. Building individual projects into one shared `OutDir` can overwrite dependencies with different versions. In particular, an API build can replace the JSON v10 assembly required by LPS with v9. Do not publish over a folder while its worker agents are running.

Generate a demo registration key without printing it. Reuse this same file in all three LPS terminals.

```powershell
$keyPath = Join-Path $lab 'demo-token.txt'
if (-not (Test-Path $keyPath)) {
    $bytes = New-Object byte[] 32
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $random.GetBytes($bytes)
    $random.Dispose()
    [System.IO.File]::WriteAllText($keyPath, [Convert]::ToBase64String($bytes))
}
```

The key file is under your local user profile. Keep it private; do not put it in Git or a shared folder.

## 2. Start Four Terminals

### Terminal A: Target

```powershell
node .\lps-docs\resources\distributed-target.cjs
```

**Check:** `Local target: http://127.0.0.1:8119`.

### Terminals B, C, D: Common Setup

Run these three lines in **each** of the remaining terminals:

```powershell
$lab = Join-Path $env:LOCALAPPDATA 'LPS\DistributedDemo'
$lps = Join-Path $lab 'app\LPS.dll'
$env:LPS_CLUSTER_TOKEN = Get-Content (Join-Path $lab 'demo-token.txt') -Raw
```

### Terminal B: Worker 1

```powershell
dotnet $lps worker --master http://127.0.0.1:5161 --name worker-1 --listen http://127.0.0.1:5162 --data-directory "$lab\worker-1"
```

### Terminal C: Worker 2

```powershell
dotnet $lps worker --master http://127.0.0.1:5161 --name worker-2 --listen http://127.0.0.1:5163 --data-directory "$lab\worker-2"
```

**Check:** both agents say they are connecting/waiting. Connection retries before the master starts are expected. **No requests should reach the target yet.**

### Terminal D: Master

```powershell
dotnet $lps master .\lps-docs\resources\distributed-plan.json --workers 2 --listen http://127.0.0.1:5161 --registration-timeout 60 --data-directory "$lab\master"
```

**Check:** workers report `Ready`, `Running`, `Finalizing`, `Completed`. The master reports `Distributed run: Completed` and prints its result path.

The master prints `Dashboard: http://127.0.0.1:<port>` and opens it when the source settings enable `LPSAppSettings.Dashboard.BuiltInDashboard`. Workers never open a browser. The dashboard uses a separate, automatically allocated loopback HTTP port, even when gRPC uses HTTPS. Add `--dashboard-port 8110` to the master command for a fixed dashboard port, provided it is free.

After metrics are finalized, the master keeps the dashboard and worker callbacks available for two polling intervals (at least 10 seconds), then exits. The loaded page retains its results, but refreshing or navigating it after the master exits will fail. Setting `BuiltInDashboard` to false disables automatic browser opening and this final wait. The source settings file is not changed.

```powershell
$LASTEXITCODE
Invoke-RestMethod http://127.0.0.1:8119/count
```

Expected: exit code **0** and `plannedRequests: 20`.

LPS also sends warm-up GETs to `/` and connection-initialization OPTIONS probes. The counter counts only **GET /load**, so those probes do not inflate the planned count.

## 3. Prove Reuse

Leave A, B, C running. Repeat the master command in D.

**Check:** another successful run; target count becomes **40**. Worker agent processes stay alive, but each run gets fresh executor processes, settings, registries, variables, and metrics stores.

## Save Cluster Settings Once

Use the existing `LPSAppSettings.Cluster` section. Explicit CLI values override saved values; the source settings file is never changed by a run.

| Saved option | Behavior in the new commands | CLI override |
| --- | --- | --- |
| `MasterNodeIP` | Worker connection address and master listener address | Worker `--master`; master `--listen` |
| `MasterNodePort` | Master port when `MasterNodeIP` is a plain host/IP; `GRPCPort` remains an accepted alias | Full address in the overrides above |
| `ExpectedNumberOfWorkers` | Required **external** agents, excluding master participation | `--workers` |
| `MasterNodeIsWorker` | Start an owned local worker, included in the readiness barrier and final metrics | `--masternodeisworker true/false` or `-miw` |

Existing files using `GRPCPort` still work. If both names are present, `MasterNodePort` wins regardless of property order. The port identifies the **master**, not a shared worker listener. `lps cluster --masternodeport <port>` saves the preferred name; `--grpcport` and `-gp` remain accepted.

### 1. Create A Settings Copy

Run once after publishing. This preserves the other application settings:

```powershell
$settings = Get-Content "$lab\app\config\lpsSettings.json" -Raw | ConvertFrom-Json
$settings.LPSAppSettings | Add-Member -MemberType NoteProperty -Name Cluster -Force -Value ([pscustomobject]@{
    MasterNodeIP = '127.0.0.1'
    MasterNodePort = 5161
    ExpectedNumberOfWorkers = 2
    MasterNodeIsWorker = $true
})
$settings | ConvertTo-Json -Depth 100 | Set-Content "$lab\cluster-settings.json" -Encoding UTF8
```

`MasterNodeIP` can also be a full URL such as `https://master.example:5161`; that URL supplies its own scheme and port. Plain loopback hosts use HTTP; other hosts use HTTPS. Remote HTTP is still rejected. HTTPS listeners require `--certificate`; a private CA requires `--ca-cert`.

### 2. Restart The Agents With That Copy

Stop the old agents with Ctrl+C first. In **both worker terminals**, set:

```powershell
$env:LPS_SETTINGS_FILE = "$lab\cluster-settings.json"
```

Worker 1:

```powershell
dotnet $lps worker --name worker-1 --listen http://127.0.0.1:5162 --data-directory "$lab\worker-1"
```

Worker 2:

```powershell
dotnet $lps worker --name worker-2 --listen http://127.0.0.1:5163 --data-directory "$lab\worker-2"
```

No `--master` is needed. Each agent needs a unique name and data directory. `--listen` is optional: with a loopback master, the worker uses loopback and an automatic port; with a remote master, it uses its detected local IP, HTTPS, and an automatic port. Remote listeners still require a valid certificate. Use `--listen https://worker.example:5162` when DNS, multiple network interfaces, NAT, or firewall rules require a specific address/port. The master port never supplies the worker's port.

For example, the first command can be reduced to:

```powershell
dotnet $lps worker --name worker-1 --data-directory "$lab\worker-1"
```

The worker advertises its full callback endpoint during registration. Workers **push iteration and host metrics to the master**. The master uses worker endpoints for control and execution-status callbacks, not polling metric values. Plans travel over the worker-initiated control stream.

### 3. Start The Master

```powershell
dotnet $lps master .\lps-docs\resources\distributed-plan.json --settings "$lab\cluster-settings.json" --data-directory "$lab\master"
```

`--settings` selects the persistent-worker workflow here, so neither the master address nor worker count needs repeating.

**Check:** two external agents plus `master-local` complete. The target count increases by **30**, and the final master metrics contain **30 requests**. `master-local` is reserved and cannot be used as an external worker name. Its executor is under the private master run's `local-worker` directory and exits after final metrics and dashboard refresh; external agents remain available.

For a dedicated master, set `MasterNodeIsWorker` to false: two external workers produce **20 requests**. For local-only execution, set `ExpectedNumberOfWorkers` to 0 and `MasterNodeIsWorker` to true: **10 requests**. Zero external workers with master participation disabled is rejected.

When the entire `Cluster` section is absent, the new mode keeps its prior defaults: one external worker and no local execution. In a configured section, an omitted `ExpectedNumberOfWorkers` retains the legacy options default of zero; specify the intended count. An omitted `MasterNodeIsWorker` stays false in the new mode. `LPS_CLUSTER_TOKEN` is still required and remains separate from these settings.

## Existing Legacy Commands

Existing `run <plan>` and bare `master <plan>` remain available. Their cluster settings accept both port names. A legacy worker now binds an automatic independent HTTP port and registers its full endpoint after binding. Existing worker commands need no new arguments; `run <plan> --listen http://<worker-ip>:5162` selects an explicit callback address and port. Legacy commands retain their existing HTTP transport; use the persistent workflow for HTTPS.

Updated masters use the registered endpoint for registration replies, trigger/cancel, health checks, and iteration-status queries. An older IP-only registration still falls back to the configured master port, preserving the old shared-port convention for that metadata. This is configuration/command compatibility, not a guarantee that mixed old/new binaries support automatic worker ports. Use the same updated build on all nodes.

## Find The Evidence

```powershell
Get-ChildItem "$lab\master" -Recurse -Filter cluster-result.json
Get-ChildItem "$lab\master" -Recurse -Filter Request_Throughput.json
Get-ChildItem "$lab\worker-*" -Recurse -Filter completion.json
```

| Artifact | Meaning |
| --- | --- |
| Master `cluster-result.json` | Overall `State`, run ID, worker/session identities, endpoints, execution states |
| Master `Metrics/.../Request_Throughput.json` | Final aggregate: `IsFinal: true`, 20 requests, 20 successes for this demo |
| Worker `completion.json` | That executor completed, failed, or was cancelled |
| `process.json` | Executor PID and run ID; informational, do not use an old PID to stop processes |
| `stdout.log`, `stderr.log`, `logs/lps.log` | Per-run diagnostics |
| `claimed` | Prevents accepting the same run ID again from the same worker data directory |

**Important:** worker `Completed` means execution finished. The authoritative failure-rule verdict is the master's overall `State` and exit code. A worker can complete while the aggregate test fails.

**Changing the next run:** edit the source plan passed to `master` (in this walkthrough, `lps-docs/resources/distributed-plan.json`). Do not edit `master/<old-run-id>/plan.json` to change future runs. Those are historical copies; compare the worker's received plan with final metrics when investigating a completed run. Ten requests can legitimately finish in about a second; a request-count plan does not promise a minimum duration.

Plan/settings copies can contain credentials. Run directories restrict access to the current Windows user; Unix permission code uses directory 700/file 600. Administrators can still access them. Logs are not guaranteed to redact every plan value. Keep artifacts private and delete them when no longer needed.

## Small Manual Failure Checks

Do one at a time; return to the successful demo between checks.

1. **Missing worker:** stop C with Ctrl+C. Run D with `--registration-timeout 5`. Expect nonzero exit, no new planned requests, and B still available.
2. **Cancel a running plan:** increase the demo request count enough to keep it running, then press Ctrl+C in D. Expect nonzero exit and workers returning to wait after cleanup. Use only this local target.
3. **Agent loss:** while running, stop B with Ctrl+C. The run must not report success. Restart B before the next explicit master command.
4. **Wrong key:** in B, temporarily replace `LPS_CLUSTER_TOKEN` with a different 32+ character value. It must report registration rejection. Restore it from the demo key file and restart B.

For exact timing, hard process loss, and deliberately occupied ports, use the automated tests below. They start and stop only their own processes.

## Automated Verification

Executed on Windows with .NET SDK 10.0.401 and the .NET 8 runtime:

| Check | Result |
| --- | --- |
| Two independent agents, two separate master runs, fresh children | PASS: 20 planned requests per run; agents reused |
| Final master cumulative snapshot | PASS: exact aggregate request and success totals |
| Same workflow over HTTPS with a temporary private CA | PASS; no OS trust-store changes |
| Intentional HTTP 500 failure rule | PASS: overall Failed, nonzero master exit, failed final metrics |
| Stop during active load | PASS: executor exits before all requests finish |
| Hard master process loss | PASS: child stops, agent remains alive, no assignment replay |
| Hard worker-agent loss without killing its child directly | PASS: executor detects stdin closure and exits; master fails |
| Missing worker | PASS: readiness barrier prevents target connections |
| Worker port already occupied | PASS: preparation fails; no target connections; other worker cancelled |
| Wrong registration key; protocol/app version mismatch | PASS over HTTP loopback and HTTPS |
| Duplicate worker name or endpoint | PASS: rejected |
| Registration token used for run RPC; legacy cancel used in new mode | PASS: Unauthenticated / Unimplemented |
| Untrusted TLS certificate | PASS: handshake rejected |
| Invalid hash, oversized/malformed plan, wrong master, replayed run ID | PASS: rejected before child spawn |
| Session ordering, stale identity, readiness publication, one-shot trigger | PASS: focused unit checks |
| Private file permissions | PASS on Windows |
| Dashboard preference and URL | PASS: master preserves preference, worker stays headless, isolated dashboard uses loopback rather than the gRPC URI |
| Browser and final refresh, separate loopback processes | PASS: 37 target requests, 37 HTTP 200 responses in the metrics API, endpoint Success and host Completed in the browser; master exit 0, agent still alive |
| Saved cluster options without master/count CLI arguments | PASS: dedicated, local-only, and mixed runs; source settings unchanged |
| CLI overrides conflicting saved options | PASS: address, count, and both true/false master participation overrides |
| Master participation over HTTP and private-CA HTTPS | PASS: exact aggregate totals, fresh local children, repeated runs, cleanup |
| Cancellation, external agent loss, and hard coordinator-child loss with local execution | PASS: local and external executors stop; no replay |
| Missing/failed external preparation with local execution | PASS: no target connections before the full readiness barrier; local cleanup |
| Local slot reservation | PASS: excess external agents cannot replace the master's local worker |
| Master port rename | PASS: old/new JSON keys, canonical precedence in both orders, configuration binding, and old/new CLI flags |
| Legacy independent worker ports | PASS: old/new settings, automatic and explicit listeners, registration/control callbacks, exactly 10 local requests; occupied port rejects startup with no load |
| Callback address compatibility | PASS: full HTTP/HTTPS/IPv6 endpoint preservation, IP-only fallback, protobuf roundtrip with/without endpoint, malformed endpoint rejection |

**Latest verification:** full .NET suite **536 passed, 0 failed, 0 skipped**, including **25 independent-process cases** (21 persistent-workflow and 4 legacy). The earlier browser verification above is separate from that automated count; the port-model follow-up was verified through automated checks, not a new browser run. Legacy process checks verify actual target counts and callbacks; saved final metrics are checked in the persistent workflow.

A separate published-build smoke check also passed: settings-only master connection, omitted worker `--listen`, 10 loopback requests, exactly 10 in final metrics with `Success`, agent still alive after the run, and source settings unchanged.

Run only distributed checks from the source root:

```powershell
dotnet test .\LPS.UnitTest\LPS.UnitTest.csproj --filter "FullyQualifiedName~DistributedWorker|FullyQualifiedName~DashboardServiceTests" --artifacts-path "$env:LOCALAPPDATA/Temp/lps-distributed-verification-build" --tl:off --verbosity quiet --logger "console;verbosity=normal"
```

Run the full suite by omitting `--filter` and its value. Do not run concurrent builds/tests against the same output directory.

The process tests launch real `dotnet` master/agent/child processes with unique temporary directories, drain redirected output, inspect exit codes and saved snapshots, and clean up owned processes in `finally`. Persistent listeners use loopback; legacy automatic listeners also exercise local-IP detection. All load targets are loopback-only. They are not mocks of distributed execution. Artifacts remain under `%TEMP%\lps-distributed-tests\<id>`; test output identifies the directory.

Automated process tests explicitly copy headless settings so they do not open browser tabs. The additional browser check used a separate published app, an independent local HTTP target, one master and one agent, and a 37-request plan. It checked the live page and `/api/metrics` before shutdown, the target count after shutdown, the master exit code, and the still-running agent. No external target or existing user process was used. Repeat the walkthrough above to exercise the same dashboard behavior with two workers and 20 requests.

## Multi-Machine Commands

Use **one approach at a time**, with the **same updated build on every node**. Do not connect persistent agents to a legacy master or legacy `run` workers to a new master.

This walkthrough uses Windows PowerShell on three machines. Replace these sample IPs everywhere, including certificates and firewall rules:

| Machine | LAN IP | Fixed listener | Other role |
| --- | --- | --- | --- |
| Master | `192.168.1.10` | `5161` | Hosts the small HTTP target on `8119` |
| Worker 1 | `192.168.1.11` | `5162` | Executes the whole 10-request plan |
| Worker 2 | `192.168.1.12` | `5163` | Executes the whole 10-request plan |

Use machines and a network you control. The persistent workflow requires HTTPS for remote cluster traffic; legacy traffic remains unauthenticated HTTP and belongs only on a trusted, isolated network. The HTTP load target below is separate from cluster transport.

### A. Prepare Every Machine

Install the .NET 8 ASP.NET Core Runtime (or an SDK that includes it). Node.js is needed only on the target machine. Check installed runtimes:

```powershell
dotnet --list-runtimes
$lab = Join-Path $env:LOCALAPPDATA 'LPS\MultiMachineTest'
New-Item -ItemType Directory -Path $lab -Force | Out-Null
$lps = Join-Path $lab 'app\LPS.dll'
```

Both `Microsoft.NETCore.App 8.x` and `Microsoft.AspNetCore.App 8.x` must be available. Securely copy the **entire published application folder** into `$lab\app` on each machine, not just the DLL. The validated build on the development machine is `%LOCALAPPDATA%\LPS\TwoProcessTest\node-endpoints-app`; alternatively publish the current source using the command near the start of this guide. An older globally installed `lps` command may not contain these changes, so the commands below use `dotnet $lps` explicitly.

Create a separate settings copy on **every machine**, preserving the other settings:

```powershell
$settings = Get-Content "$lab\app\config\lpsSettings.json" -Raw | ConvertFrom-Json
$settings.LPSAppSettings | Add-Member -MemberType NoteProperty -Name Cluster -Force -Value ([pscustomobject]@{
    MasterNodeIP = '192.168.1.10'
    MasterNodePort = 5161
    ExpectedNumberOfWorkers = 2
    MasterNodeIsWorker = $false
})
$settings.LPSAppSettings.Dashboard.BuiltInDashboard = $false
$settings | ConvertTo-Json -Depth 100 | Set-Content "$lab\cluster.json" -Encoding UTF8
$env:LPS_SETTINGS_FILE = "$lab\cluster.json"
```

Review the copied HTTP, watchdog, logging, and Influx settings before running; the other settings were intentionally preserved. Re-enter `$lab`, `$lps`, and `LPS_SETTINGS_FILE` in each new terminal. Use a **plain master IP** in this shared example: legacy role detection compares the local IP to `MasterNodeIP`. On a multi-NIC master, that IP must match the detected address printed at startup. A legacy `run --listen` override can select the intended local IP; bare legacy `master` has no such override.

To test old configuration compatibility, use `GRPCPort = 5161` **instead of** `MasterNodePort` when creating the settings copy. Both work. If both are present, `MasterNodePort` wins. Existing valid cluster settings can also be updated with `dotnet $lps cluster --masternodeport 5161`; `--grpcport` and `-gp` are equivalent aliases. Do not run that configuration command concurrently with a test.

### B. Prepare A Small Plan And Target

On the **master**, create this bounded plan. For the legacy workflow, securely copy the resulting plan unchanged to `$lab\plan.json` on both workers as well. The new workflow transfers it automatically; do not pass a plan to `worker`.

```powershell
@{
    Name = 'Multi-machine smoke'
    Rounds = @(@{
        Name = 'Round'
        NumberOfClients = '1'
        Iterations = @(@{
            Name = 'Request'
            Mode = 'R'
            RequestCount = '10'
            HttpRequest = @{ URL = 'http://192.168.1.10:8119/load'; HttpMethod = 'GET' }
        })
    })
} | ConvertTo-Json -Depth 100 | Set-Content "$lab\plan.json" -Encoding UTF8
```

In a **separate terminal on the master**, start this disposable Node.js target. It counts only `GET /load`, not warm-up or OPTIONS probes:

```powershell
$env:LPS_DEMO_HOST = '192.168.1.10'
node -e @'
const http = require('node:http');
let plannedRequests = 0;
const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/load') plannedRequests++;
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ plannedRequests }));
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(8119, process.env.LPS_DEMO_HOST, () => console.log('Target: http://' + process.env.LPS_DEMO_HOST + ':8119'));
'@
```

From another terminal, read the count before/after each run:

```powershell
Invoke-RestMethod http://192.168.1.10:8119/count
```

Expect a **20-request increase** for two external workers with a dedicated master, or **30** in the new workflow with master participation. Restart only this target with Ctrl+C to reset its count. A worker may finish 10 requests very quickly; request count is not a duration.

### C. Network Access

For the fixed-port examples, allow worker-to-master TCP `5161`, master-to-worker-1 TCP `5162`, master-to-worker-2 TCP `5163`, and both workers to the target's TCP `8119`. Apply equivalent rules in any upstream firewall. Do not disable the firewall or expose legacy endpoints publicly.

Optional Windows firewall commands follow. **Run these yourself in an elevated PowerShell terminal on the named machine**, only on a trusted network with the Private profile. They are not run by LPS. Consult your administrator for other profiles/policies.

Master:

```powershell
New-NetFirewallRule -DisplayName 'LPS lab master' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5161,8119 -RemoteAddress 192.168.1.11,192.168.1.12 -Profile Private
```

Worker 1:

```powershell
New-NetFirewallRule -DisplayName 'LPS lab worker' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5162 -RemoteAddress 192.168.1.10 -Profile Private
```

Worker 2:

```powershell
New-NetFirewallRule -DisplayName 'LPS lab worker' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5163 -RemoteAddress 192.168.1.10 -Profile Private
```

Automatic ports **do not fit these fixed-port rules**. Use an administrator-approved application rule restricted to the cluster peers, or use the explicit ports below. LPS does not open firewall/NAT rules. Certificate names and advertised addresses must also be reachable; `Test-NetConnection` only checks TCP, not TLS or authentication.

### D. Credentials For The New Workflow Only

Skip this section for legacy. For new remote workers, every node needs the same registration token, its own server PFX, and the trusted cluster CA PEM. You can use certificates from your existing PKI; their SANs must match the advertised IPs or DNS names.

**Optional disposable Windows lab certificates:** run the following once on a trusted provisioning machine, after setting `$lab`. It creates certificates in `Cert:\CurrentUser\My`, not the trusted-root store. Keep the private CA key on that machine. Use real cluster certificates for normal deployments.

```powershell
New-Item -ItemType Directory -Path "$lab\certs" -Force | Out-Null
$password = Read-Host 'Password for the lab PFX files' -AsSecureString
$ca = New-SelfSignedCertificate -Type Custom -Subject 'CN=LPS MultiMachine Lab CA' -KeyAlgorithm RSA -KeyLength 3072 -KeyUsage CertSign,CRLSign,DigitalSignature -KeyExportPolicy NonExportable -TextExtension @('2.5.29.19={critical}{text}ca=1') -CertStoreLocation 'Cert:\CurrentUser\My' -NotAfter (Get-Date).AddDays(30)
$encoded = [Convert]::ToBase64String($ca.RawData, [Base64FormattingOptions]::InsertLineBreaks)
[IO.File]::WriteAllText("$lab\certs\ca.pem", "-----BEGIN CERTIFICATE-----`r`n$encoded`r`n-----END CERTIFICATE-----`r`n", [Text.Encoding]::ASCII)
$machines = [ordered]@{ master = '192.168.1.10'; worker1 = '192.168.1.11'; worker2 = '192.168.1.12' }
foreach ($machine in $machines.GetEnumerator()) {
    $extensions = @("2.5.29.17={text}IPAddress=$($machine.Value)", '2.5.29.37={text}1.3.6.1.5.5.7.3.1')
    $leaf = New-SelfSignedCertificate -Type Custom -Subject "CN=$($machine.Value)" -Signer $ca -KeyAlgorithm RSA -KeyLength 2048 -KeyUsage DigitalSignature,KeyEncipherment -KeyExportPolicy Exportable -TextExtension $extensions -CertStoreLocation 'Cert:\CurrentUser\My' -NotAfter (Get-Date).AddDays(7)
    Export-PfxCertificate -Cert $leaf -FilePath "$lab\certs\$($machine.Key).pfx" -Password $password -ChainOption EndEntityCertOnly | Out-Null
}
$bytes = New-Object byte[] 32
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($bytes)
$random.Dispose()
[IO.File]::WriteAllText("$lab\cluster-token.txt", [Convert]::ToBase64String($bytes))
```

Securely distribute only each machine's own PFX, the public `ca.pem`, and the **same** `cluster-token.txt` into the matching `$lab` paths. Do not independently generate a token on each node. Keep files private to the worker account; do not put them in Git, paste them into chat, or expose them through the target server. Leaf private keys on the provisioning machine also need protecting.

On **each node's LPS terminal**, load the credentials without echoing them:

```powershell
$env:LPS_CLUSTER_TOKEN = (Get-Content "$lab\cluster-token.txt" -Raw).Trim()
$env:LPS_CLUSTER_CERT_PASSWORD = [Net.NetworkCredential]::new('', (Read-Host 'This node PFX password' -AsSecureString)).Password
```

The password must be available as a process environment string for the listener. It is not supplied as a CLI argument. With a publicly trusted certificate, `--ca-cert` can be omitted. There is no certificate-validation bypass. This token grants trusted cluster membership; it is not per-worker identity authentication.

### E. New Approach: Persistent Workers

**Start both workers first.** They can wait/retry until the master appears. These commands use the settings and credentials prepared above.

Worker 1, fixed port:

```powershell
dotnet $lps worker --name worker-1 --listen https://192.168.1.11:5162 --certificate "$lab\certs\worker1.pfx" --ca-cert "$lab\certs\ca.pem" --data-directory "$lab\new-worker-1"
```

Worker 2, fixed port:

```powershell
dotnet $lps worker --name worker-2 --listen https://192.168.1.12:5163 --certificate "$lab\certs\worker2.pfx" --ca-cert "$lab\certs\ca.pem" --data-directory "$lab\new-worker-2"
```

Neither command needs `--master` because `LPS_SETTINGS_FILE` supplies the master IP/port. To override it explicitly, append `--master https://192.168.1.10:5161`. Each agent requires a unique name and private data directory; do not start a second agent in the same directory.

**Automatic worker IP/port alternatives:** stop the corresponding fixed-port agent with Ctrl+C, then use these instead, after allowing dynamic callback ports through the firewall:

```powershell
# Worker 1 machine
dotnet $lps worker --name worker-1 --certificate "$lab\certs\worker1.pfx" --ca-cert "$lab\certs\ca.pem" --data-directory "$lab\new-worker-1"
# Worker 2 machine
dotnet $lps worker --name worker-2 --certificate "$lab\certs\worker2.pfx" --ca-cert "$lab\certs\ca.pem" --data-directory "$lab\new-worker-2"
```

Omitting `--listen` detects the local IP and selects an automatic port. For a remote master it uses HTTPS; the PFX SAN must cover that detected IP. `--listen https://192.168.1.11:0` instead fixes the advertised IP while choosing the port automatically. Use explicit DNS/IP listeners on multi-NIC/NAT networks. The flag is **`--listen`**, not `--listener`.

Master, after both workers have started:

```powershell
dotnet $lps master "$lab\plan.json" --settings "$lab\cluster.json" --certificate "$lab\certs\master.pfx" --ca-cert "$lab\certs\ca.pem" --registration-timeout 120 --data-directory "$lab\new-master"
$LASTEXITCODE
```

`--settings` deliberately selects the new workflow. Expected: `Ready`, `Running`, `Finalizing`, `Completed`; master exit **0** and count increases by **20**. No planned load starts until all selected executors are prepared. Workers remain alive; repeat **only the master command** for another run.

Optional explicit master settings override (use instead of the preceding master command):

```powershell
dotnet $lps master "$lab\plan.json" --listen https://192.168.1.10:5161 --workers 2 --masternodeisworker false --certificate "$lab\certs\master.pfx" --ca-cert "$lab\certs\ca.pem" --registration-timeout 120 --data-directory "$lab\new-master"
```

Master also generates load (two external workers plus one local executor, **30** planned requests):

```powershell
dotnet $lps master "$lab\plan.json" --settings "$lab\cluster.json" --masternodeisworker true --certificate "$lab\certs\master.pfx" --ca-cert "$lab\certs\ca.pem" --registration-timeout 120 --data-directory "$lab\new-master"
```

`ExpectedNumberOfWorkers` / `--workers` counts **external workers**, not the local executor. The local executor uses a separate automatic callback port and participates in the same readiness barrier. The master must be able to reach its own advertised HTTPS address; its certificate covers that address. For local-only execution, use `--workers 0 --masternodeisworker true` with the master command; no external agents are required.

To enable the dashboard, set `Dashboard.BuiltInDashboard` to true in the master settings copy before the run. Optionally append `--dashboard-port 8110`. Open the printed URL on the master itself: the new dashboard is loopback-only, not a remote LAN dashboard. Workers remain headless.

### F. Legacy Approach: Master First, Then Run Workers

Stop persistent agents and their master before switching approaches. Legacy uses the shared **plain master IP**, `MasterNodePort`, and `LPS_SETTINGS_FILE` from section A. It does not use `LPS_CLUSTER_TOKEN`, PFX options, or the new readiness barrier. The **same plan must exist on all machines**. Use a dedicated master for the initial small test.

On the master, start this command **first** and wait for `Master node is ready`:

```powershell
dotnet $lps master "$lab\plan.json"
```

Do **not** append `--settings`, `--workers`, `--listen`, or `--masternodeisworker` to this bare command: those options select the new workflow. It obtains settings from `LPS_SETTINGS_FILE`. Bare legacy `master` is dedicated even when `MasterNodeIsWorker` is true.

Then start the workers. **Automatic ports, no extra listener arguments:**

```powershell
# Worker 1 machine
dotnet $lps run "$lab\plan.json"
# Worker 2 machine
dotnet $lps run "$lab\plan.json"
```

Or use **fixed worker ports** for the firewall rules in section C:

```powershell
# Worker 1 machine
dotnet $lps run "$lab\plan.json" --listen http://192.168.1.11:5162
# Worker 2 machine
dotnet $lps run "$lab\plan.json" --listen http://192.168.1.12:5163
```

Choose one command per worker, not both alternatives. Each worker prints `Node endpoint: http://<ip>:<port>`. It sends that full endpoint in `RegisterNode` metadata **after the listener binds**. The master uses it for callbacks, rather than assuming workers use the master port. Worker processes exit after their runs; start fresh worker commands for the next legacy run.

Expected with both workers participating: target count increases by **20**. Legacy startup is not synchronized: a worker may start as soon as it sees the master Ready/Running. `ExpectedNumberOfWorkers` does not add the new preparation barrier. Check registration logs and target counts; exit code alone is not proof of success, because some legacy command failures are logged without a nonzero exit. Plain legacy CLI runs also do not produce the new `cluster-result.json` or automatically persisted throughput files.

Alternative legacy master command, with the existing `MasterNodeIsWorker = false` setting, including an explicit master IP for multi-NIC hosts:

```powershell
dotnet $lps run "$lab\plan.json" --listen http://192.168.1.10:5161
```

To make the **legacy master also execute load**, change its settings copy and use `run`, not bare `master`:

```powershell
$settings = Get-Content "$lab\cluster.json" -Raw | ConvertFrom-Json
$settings.LPSAppSettings.Cluster.MasterNodeIsWorker = $true
$settings | ConvertTo-Json -Depth 100 | Set-Content "$lab\cluster.json" -Encoding UTF8
dotnet $lps run "$lab\plan.json" --listen http://192.168.1.10:5161
```

This starts master-side execution immediately. A tiny 10-request plan can finish before workers join; it is not a reliable synchronized mixed-node test. Prefer the new workflow for that test, or arrange a suitably longer bounded legacy plan and launch worker terminals promptly. Do not interpret missing workers as successful participation. Restore `MasterNodeIsWorker` to false in the copy before repeating the dedicated-master baseline.

### G. Verify, Repeat, And Stop

For the new workflow, inspect results on the master:

```powershell
Get-ChildItem "$lab\new-master" -Recurse -Filter cluster-result.json
Get-ChildItem "$lab\new-master" -Recurse -Filter Request_Throughput.json
Invoke-RestMethod http://192.168.1.10:8119/count
```

Use the **latest run directory**, not an older result. Verify overall `Completed`, final cumulative request count 20 (or 30 with local execution), and successful HTTP responses. Worker `Completed` alone is not the final failure-rule verdict. Edit only the source plan for the next run, never archived per-run copies.

| Operation | New workflow | Legacy workflow |
| --- | --- | --- |
| Next run | Repeat master; agents stay running | Restart master, then worker `run` commands |
| Cancel | Ctrl+C in the master terminal | Ctrl+C in the master terminal; check workers stop |
| Stop idle workers | Ctrl+C in each agent terminal | No idle persistent agent |
| Stop local target | Ctrl+C in its Node terminal | Same |
| Missing worker test | Append `--registration-timeout 5`; expect nonzero exit and no planned load | No equivalent preparation-barrier guarantee; stop the waiting master manually |

Never blanket-kill `dotnet`. Inspect final logs before repeating a failed run; keep worker data directories so run claims cannot be replayed. Remove credentials from each terminal after stopping its processes:

```powershell
Remove-Item Env:LPS_CLUSTER_TOKEN,Env:LPS_CLUSTER_CERT_PASSWORD,Env:LPS_SETTINGS_FILE -ErrorAction SilentlyContinue
```

If you created the optional firewall rules, remove **only those lab rules**, in elevated terminals on the respective machines:

```powershell
# Master only
Remove-NetFirewallRule -DisplayName 'LPS lab master'
# Each worker only
Remove-NetFirewallRule -DisplayName 'LPS lab worker'
```

Protect or remove only your test artifacts, token, and lab certificates after the test. The optional CA/leaf certificates remain in the provisioning user's Personal certificate store until explicitly removed; no trusted-root installation was performed.

### H. Change Summary And Troubleshooting

| Change / symptom | Meaning / action |
| --- | --- |
| `MasterNodePort` replaces the conceptual shared port | `GRPCPort` remains accepted; canonical name wins when both exist |
| Worker port omitted | Automatic independent port in both approaches; master connection still uses configured master port |
| Full callback registration | Legacy protobuf adds optional `endpoint` field 12; existing field numbers and IP/name identities are preserved |
| Old IP-only metadata | Updated client factory falls back to host plus configured master port; mixed old/new binaries are not guaranteed to support automatic ports |
| Callback direction | Workers push iteration/host metrics; master calls workers for control/status, not polling metric values |
| Generated settings | Private run copies use the preferred port name; running a test does not rewrite the source settings |
| `Unrecognized --listener` | Correct option is `--listen` |
| Worker keeps waiting | Confirm master started in the same workflow, correct IP/port, matching build/token, and reachable TCP/TLS |
| TLS handshake failure | Check CA, expiry, PFX password, and SAN against the advertised IP/DNS; automatic IP may differ on multi-NIC hosts |
| Preparation cannot bind | Pick a free worker port; do not stop an unrelated listener |
| Registration works, callbacks fail | Check worker inbound firewall/NAT; registration is outbound but callbacks are inbound |
| `worker.lock` collision | Two agents share a data directory; give each its own |
| Missing legacy workers / very fast completion | Check IP-based roles and startup order; legacy lacks the new readiness barrier |

Persistent automatic ports use a probe before child binding, leaving a small bind race; bind failures fail preparation without starting planned load. Legacy automatic ports are assigned directly by the OS during binding. Automatic addresses do not solve routing, certificate deployment, or firewall policy.

**Verification boundary:** the 536-test result and published-build smoke above were obtained locally. These multi-machine commands were checked against the implementation and for PowerShell syntax; they are a manual deployment procedure, not a claim of completed LAN/WAN, Linux/macOS, NAT, clock-skew, or certificate-deployment testing. The optional Windows certificate/firewall commands were not executed as part of documenting this procedure.

## Boundaries

- One assignment per agent connection; after release/master exit, the persistent agent reconnects for the next explicit run.
- A dropped connection cancels its active run. Idle registration retries use bounded backoff. Missing heartbeats expire after the configured lease (default 10 seconds, range 3-30); cleanup has additional bounded grace periods.
- No automatic resume/replay or durable master recovery. Use a **new explicit run** after interruption. Keep worker data directories so run claims remain available.
- JSON/YAML is normalized to JSON, hashed, and limited to 1 MiB. Only the plan is transferred, not arbitrary dependency files.
- Provision referenced data/certificates locally with valid absolute paths on all relevant nodes. Relative paths resolve inside the private run directory, not beside the original plan.
- This command runs the complete plan with no round/tag/environment-selection flags. Unsupported flags are rejected. Use a self-contained plan for initial verification.
- Preparation may resolve external variables/dependencies. The barrier prevents planned execution and warm-up before Start, not every conceivable network action in a user-defined plan.
- Worker settings control their local HTTP/watchdog behavior. `--settings` chooses the source copy. Worker Influx export is disabled; the master retains its configured exporter.
- Process isolation is **not a permission sandbox**. Trust the master, plans, authenticated workers, and their advertised callback endpoints. Do not expose this as a public, multi-tenant service.
- Silent network blackholes, all cancellation timings, large-cluster stress, and remote-host deployment are not exhaustively tested by this matrix.

## Stop And Clean Up

Press **Ctrl+C in B and C**, then **Ctrl+C in A**. D normally exits by itself. Do not use a blanket `Stop-Process dotnet` command: it could stop your UI or unrelated tests.

After inspecting results, remove only your demo/test artifact directories. Remove `LPS_CLUSTER_TOKEN` from these terminals when finished. Do not delete run claims while an agent is active.
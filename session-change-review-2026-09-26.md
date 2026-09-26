# Session Change Review

Date: 2026-09-26

## Commit Map

These are three independent Git repositories, not submodules. No branches were created and nothing was pushed.

| Repository | Branch | Commit | Scope |
| --- | --- | --- | --- |
| Main LPS repository | `feature/sequential-clients-finalization-ui` | `e4e0c44` | Local workspace backend, scheduling, metrics delivery, console logging, cooling telemetry, tests, and README. 85 files; 2,993 additions and 475 deletions. |
| `lps-dashboard` | `main` | `c871cc1` | Workspace editor, history/results, runner routing, charts, branding, compatible dependencies, and frontend tests. 25 files; 1,746 additions and 61 deletions. |
| `lps-docs` | `main` | This documentation commit | Sequential-client command/round docs, legacy-plan audit, and this review report. |

The main commit builds on `c396890`, which already introduced sequential-client execution and animated finalization. The new commit refines those features; it does not introduce them from scratch. The dashboard baseline is `bf3f231`.

Links below work in the current workspace layout, where the dashboard and documentation repositories sit inside the main checkout.

## Features And Review Areas

### 1. Local Web Workspace

**User-facing changes:** `lps ui` starts a detached, per-user workspace at `http://127.0.0.1:8010/workspace` and returns the terminal. Repeated launches reuse a compatible host. `lps ui stop` requests graceful shutdown. Port, data directory, web root, browser opening, and foreground mode are configurable.

The UI supports saved plans, multiple rounds and iterations, duplication/removal/reordering, flat and staged loads, request-count and duration modes, headers/raw bodies, failure/termination rules, SkipIf conditions, validation, JSON export, run/stop controls, and output. Unsupported advanced structures remain preserved rather than silently rewritten.

**Backend entry points:** [Program](../LPS/Program.cs), [WebUiCommand](../LPS/UI.Core/Web/WebUiCommand.cs), [WebUiHost](../LPS/UI.Core/Web/WebUiHost.cs), [WorkspacePlanService](../LPS/UI.Core/Web/Services/WorkspacePlanService.cs), [WorkspaceRunService](../LPS/UI.Core/Web/Services/WorkspaceRunService.cs), and the workspace controllers/models beside those services.

**Frontend entry points:** [Workspace](../lps-dashboard/src/workspace/Workspace.js), [PlanNavigator](../lps-dashboard/src/workspace/PlanNavigator.js), [WorkloadEditor](../lps-dashboard/src/workspace/WorkloadEditor.js), [RuleEditor](../lps-dashboard/src/workspace/RuleEditor.js), [workspaceApi](../lps-dashboard/src/workspace/workspaceApi.js), and [workspace styles](../lps-dashboard/src/workspace/workspace.css).

**Execution boundary:** One workspace-managed run at a time, in a separate CLI process. `LPS_SETTINGS_FILE` supplies per-run settings and `LPS_WORKSPACE_RUN` activates managed status/persistence behavior. Managed networking uses loopback; normal CLI networking is retained. [LocalWorkspaceAccessMiddleware](../Apis/Middleware/LocalWorkspaceAccessMiddleware.cs) checks local hosts/origins and the workspace API header. OpenAPI and [HTTP examples](../LPS/UI.Core/Web/workspace.http) accompany the API.

**Review focus:** Saving and restoring complex plans without losing unsupported fields, correct validation selection, graceful child cancellation, host reuse, and local-only access assumptions.

### 2. Run History And Retained Results

**User-facing changes:** Searchable/status-filtered history, per-run history URLs, retained logs/results, downloads, and snapshot restoration. Switching between Editor and History preserves the draft. Results show cumulative endpoint metrics grouped by round and host summaries after completion.

**Key files:** [RunHistory](../lps-dashboard/src/workspace/RunHistory.js), [RunResults](../lps-dashboard/src/workspace/RunResults.js), [RunOutput](../lps-dashboard/src/workspace/RunOutput.js), [runMetrics](../lps-dashboard/src/workspace/runMetrics.js), [useRunMetrics](../lps-dashboard/src/workspace/useRunMetrics.js), [TestExecutionService](../LPS/UI.Core/Services/TestExecutionService.cs), and [HostMetricsAggregatorFactory](../LPS.Infrastructure/Monitoring/Hosts/HostMetricsAggregatorFactory.cs).

Managed runs persist after final metric publication, including cumulative host snapshots. History merges those retained snapshots with live results. Windowed snapshots are excluded from cumulative result tables/downloads. [apiBaseUrl](../lps-dashboard/src/apiBaseUrl.js) routes existing dashboards to the selected runner.

**Review focus:** Completed versus live snapshots, host/endpoint error-rate units, multiple rounds with repeated iteration names, and restart persistence. Older runs without host snapshot files cannot reconstruct host results.

### 3. Sequential Clients And Schedule Planning

**Behavior preserved:** All client commands are prepared and registered before execution begins. Sequential clients wait for the previous client's complete lifecycle, including hooks. Stage startup delays occur before that stage's first client; arrival delays are ignored in sequential mode. `RunInParallel` independently controls iterations within a client.

**Fix:** Concurrent arrivals use long relative offsets anchored to one execution start after preparation. Slow registration no longer consumes the intended arrival spacing.

**Design change:** [RoundScheduleBuilder](../LPS.Domain/LPSRounds/RoundScheduleBuilder.cs) computes flat/staged client schedules without clients, logging, clocks, or execution. [ClientSchedule](../LPS.Domain/LPSRounds/ClientSchedule.cs) and [PreparedClient](../LPS.Domain/LPSRounds/PreparedClient.cs) replace nested client tuples. [Round execution](../LPS.Domain/LPSRounds/Round+ExecuteCommand.cs) retains registration, execution, and cancellation cleanup, reusing the iteration scheduler.

**Review focus:** Stage boundaries, ordering, arithmetic beyond 32-bit offsets, slow preparation, and cancellation of only unstarted commands. This does not make client/command allocation lazy or bounded.

### 4. Final Metrics Before Dashboard Shutdown

**Fix:** An empty channel is no longer treated as proof that the last metrics send finished. The final snapshot may already have been removed from the channel while SignalR or Influx delivery is still in progress.

**New ordering:** Finish execution, stop both coordinators and await final snapshot production, complete all four dispatcher queues, await the consumers including in-flight sends, allow the dashboard polling window, persist managed results, then stop the host.

**Key files:** [MetricsDispatcher](../Apis/Services/MetricsDispatcher.cs), [IMetricsDispatcher](../LPS.Common/Interfaces/IMetricsDispatcher.cs), the four concrete dispatchers under `Apis/Services`, queue completion methods, [API registration](../Apis/Startup.cs), [HostedService](../LPS/UI.Core/Host/HostedService.cs), and [DashboardService](../LPS/UI.Core/Host/DashboardService.cs).

The shared single-consumer lifecycle replaces competing timed drain loops. Registration ensures shutdown coordination and hosted execution reference the same dispatcher instances. The post-dispatch polling window is at least ten seconds because the endpoints page polls every five seconds, even when the configured push interval is one second.

**Review focus:** In-flight sends with empty queues, backlog ordering, shared DI identity, final HTTP polling, and cancellation. This addresses graceful finalization, not forced process termination, failed networks, or guaranteed client-side acknowledgement.

### 5. Console Logging And Finalization Display

**Fix:** A formatter no longer bypasses the logging stream by writing directly to a shared stdout console. The formatter produces renderables; the provider/adapter preserves stdout versus stderr routing.

**Key files:** [SpectreConsoleFormatter](../LPS/UI.Core/Host/SpectreConsoleFormatter.cs), [SpectreConsoleLoggerProvider](../LPS/UI.Core/Host/SpectreConsoleLoggerProvider.cs), [SpectreConsoleLogger](../LPS/UI.Core/Host/SpectreConsoleLogger.cs), [LiveConsoleLoggingExtensions](../LPS/UI.Core/Host/LiveConsoleLoggingExtensions.cs), and [LiveConsoleOutput](../LPS/UI.Core/Host/LiveConsoleOutput.cs).

The provider preserves Console-category configuration, filtering, scopes, option reload, and other providers. During live animation, redirected stderr can flush normally; terminal stderr waits until the live display ends. Each frame processes at most 128 queued messages; final shutdown drains the remainder. The frame renderer also corrects the ASCII logo spacing.

**Review focus:** Concurrent logging, no duplicate providers, stream selection, shutdown failures, and restored output after animation. The per-frame limit is not a bound on total queued memory.

### 6. Cooling, Idle Windows, And Charts

**New telemetry:** [CoolingTracker](../LPS.Infrastructure/Monitoring/CoolingTracker.cs) records actual watchdog cooling and CB/CRB/DCB batch pauses through [ICoolingTracker](../LPS.Domain/Domain.Common/Interfaces/ICoolingTracker.cs), [CoolingPeriod](../LPS.Domain/Domain.Common/CoolingPeriod.cs), metrics services, the iteration modes, and [Watchdog](../LPS.Infrastructure/Watchdog/Watchdog.cs). Host and iteration window snapshots carry these intervals.

**Frontend:** [WindowedCharts](../lps-dashboard/src/views/WindowedCharts.js) and [coolingPeriods](../lps-dashboard/src/views/coolingPeriods.js) show compact `C` markers and shading. The Flags toggle affects rendering, not collection or export. Watchdog and batch cooldowns are distinguished. Idle windows are treated separately: zero activity does not prove cooldown, and unsampled latency remains a gap rather than a fabricated zero.

**Metrics/export:** Window rates use their reporting-window duration. [InfluxDBLineProtocolConverter](../LPS.Infrastructure/Monitoring/MetricsServices/InfluxDBLineProtocolConverter.cs) adds idle/window-rate fields and iteration `windowed_cooling` interval points with source, start/end, and duration. Workspace-managed runs still disable Influx output.

**Review focus:** Cancellation closes cooldown scopes, overlapping sources, window boundaries, host aggregation, units, and chart toggles. See unresolved limitations below before relying on distributed or same-host/different-port cooling data.

### 7. Dependencies, Branding, And Packaging

- React and ReactDOM are pinned to 18.3.1 for compatibility with the current Reactstrap stack. The Babel override supports the test/build toolchain.
- Public index/manifest files and logo/icon assets use LPS branding. The workspace adds its own scoped layout and styles.
- [LPS.csproj](../LPS/LPS.csproj) packages assets from `lps-dashboard/build` when present, falling back to `Apis/wwwroot`. It also references Swagger support for the workspace API.
- The Razor layout and tracked web manifests reference the updated build assets. Generated bundles themselves remain ignored: build the dashboard before the .NET application for a reproducible source deployment.
- The main [README](../readme.md) documents build order, UI commands, supported workflows, metrics behavior, and plaintext-storage limitations.

### 8. Legacy Plan Audit And User Documentation

The [legacy plan audit](legacy-plan-audit-2026-09-26.md) covers 40 top-level plans without modifying them. All 31 YAML files were smoke-tested using original URLs and bounded workloads. Nine JSON files were flagged for invalid GUIDs and obsolete root structures. The report separates runtime issues, expected skips, and warning-only cases; it does not claim full stress-load validation.

[Command documentation](articles/1.Commands.md) and [round documentation](concepts/1.Rounds.md) describe sequential clients, their CLI option, ignored arrival delays, and stage behavior.

## Validation

| Check | Result |
| --- | --- |
| Full .NET suite, rerun before commit | 408 passed |
| Frontend suite, rerun before commit | 62 passed across two suites |
| Latest normal solution rebuild in this session | Succeeded: zero errors, 248 warnings |
| Staged backend/frontend whitespace checks | Passed |
| Added-text scan for common credential/key patterns | No candidates; not an exhaustive security audit |
| Six loopback integration scenarios | Passed: sequential/concurrent R, CRB with throughput maximization off/on, DCB, and CB cancellation |
| Final-delivery integration | Final HTTP polls and SignalR snapshots observed before shutdown; endpoints/host-dashboard browser checks passed for completion and cancellation |
| History persistence | Results survived an isolated workspace restart |
| Legacy plan originals | All 40 initial SHA-256 hashes unchanged |

Useful regression entry points: [RoundExecutionTests](../LPS.UnitTest/RoundExecutionTests.cs), [MetricsDispatcherShutdownTests](../LPS.UnitTest/MetricsDispatcherShutdownTests.cs), [DashboardServiceTests](../LPS.UnitTest/DashboardServiceTests.cs), [SpectreConsoleFormatterTests](../LPS.UnitTest/SpectreConsoleFormatterTests.cs), [FinalizationDisplayTests](../LPS.UnitTest/FinalizationDisplayTests.cs), [WorkspaceServiceTests](../LPS.UnitTest/WorkspaceServiceTests.cs), [CoolingTrackerTests](../LPS.UnitTest/CoolingTrackerTests.cs), [WindowedMetricsTests](../LPS.UnitTest/WindowedMetricsTests.cs), [workspaceApi tests](../lps-dashboard/src/workspace/workspaceApi.test.js), and [WindowedCharts tests](../lps-dashboard/src/views/WindowedCharts.test.js).

## Known Limitations And Follow-Ups

- Cooling host normalization currently strips ports: intervals can be conflated for the same hostname on different ports. This was identified but not fixed in this work.
- Cooling interval history is retained without a bound and scanned under a lock. Large/long runs need a retention review.
- Worker cooling events are not forwarded to the master; distributed host telemetry also has existing limitations. No live Influx deployment was tested.
- The workspace is local-only, not authenticated cloud hosting. Plans, snapshots, and settings can contain plaintext credentials; console redaction does not cover all URLs, payloads, or artifacts.
- The editor's wording around running a round in parallel is ambiguous: the setting controls iterations within a client, not parallel rounds.
- Sequential execution still prepares clients/commands upfront. Console pending-log storage is also unbounded despite the per-frame drain limit.
- UI history cannot recover host metrics for old runs that never persisted host snapshots.
- Legacy-plan smoke checks do not cover original large-load profiles, later stages, all retry paths, or deliberately skipped branches. Some plans can report iteration `Success` despite HTTP/DNS failures; consult response-code snapshots.

## Excluded And Left Untouched

Not committed: crash dumps, ZIP archives, build/test/engine logs, TRX output, dump-analysis output, local data fixtures, temporary smoke copies/raw artifacts, demo recordings/media, older unrelated release/article drafts, the old Grafana OTLP template, and the old unreferenced standalone `WindowedDashboard.js` prototype.

These files were not deleted or reverted. The nested repositories retain their existing layout. The working trees therefore may still show untracked material; that is intentional, not an incomplete staging of the session's feature changes.

## Review Commands

Run from the main workspace root:

```powershell
git show --stat e4e0c44
git diff c396890 e4e0c44 -- LPS/UI.Core/Web LPS/UI.Core/Services/TestExecutionService.cs
git diff c396890 e4e0c44 -- LPS.Domain/LPSRounds
git diff c396890 e4e0c44 -- Apis/Services LPS/UI.Core/Host
git diff c396890 e4e0c44 -- LPS.Infrastructure/Monitoring LPS.Domain/LPSIteration/IterationMode
git -C lps-dashboard show --stat c871cc1
git -C lps-dashboard diff bf3f231 c871cc1 -- src/workspace
git -C lps-dashboard diff bf3f231 c871cc1 -- src/views
git -C lps-docs show --stat HEAD
```

For a source rebuild, build the dashboard first as documented in the main README. Stop processes using the normal output before rebuilding it. Building to an isolated `OutDir` alone does not update an already running UI or the normal CLI binaries.

# Logger Configuration

The **Logger Configuration** in the LPS Tool allows you to customize logging settings for test operations. Proper logging is essential for analyzing test results and troubleshooting issues. This command provides flexibility in specifying log output locations, enabling or disabling console logging, and setting verbosity levels.

## Command Usage

```bash
lps logger [options]
```

## How It Works

1. **Log Output Locations**:  
   Specify whether logs should be written to a file, displayed on the console, or both.

2. **Log Verbosity Levels**:  
   Control the level of detail captured in logs to suit your debugging and analysis needs.

3. **Error Logging**:  
   Configure error-specific logging to toggle visibility on the console or in log files.

## Options

### File Logging Options
- `-lfp`, `--logFilePath <logFilePath>`:  
  Specifies the file path where log output will be written.

- `-dfl`, `--disableFileLogging`:  
  Enables or disables logging to files.

### Console Logging Options
- `-ecl`, `--enableConsoleLogging`:  
  Enables or disables logging to the console.

- `-dcel`, `--disableConsoleErrorLogging`:  
  Toggles error logging visibility on the console.

### Logging Levels
- `-ll`, `--loggingLevel <level>`:  
  Sets the verbosity of logs. The selected level will log messages for that level and above. For example, selecting `Warning` will log `Warning`, `Error`, and higher.

- `-cll`, `--consoleLoggingLevel <level>`:  
  Determines the detail of logs displayed on the console. The levels include:

  - `Verbose`: Detailed logs for extensive debugging. Logs `Verbose`, `Information`, `Warning`, and `Error` messages.
  - `Information`: General logs for normal operation. Logs `Information`, `Warning`, and `Error` messages.
  - `Warning`: Logs potential issues that do not stop execution. Logs `Warning` and `Error` messages.
  - `Error`: Logs errors encountered during execution. Only logs `Error` messages.

## Example Usage

### Enable Console Logging and Set Log File Path
```bash
lps logger -ecl -lfp "/path/to/logfile.log"
```

### Disable File Logging
```bash
lps logger -dfl
```

### Set Console Logging Level to Warning
```bash
lps logger -cll Warning
```

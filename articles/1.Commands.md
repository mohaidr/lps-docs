
# Commands Documentation

This section provides a detailed reference for the commands and options supported by the **LPS Tool**.

---

## General Usage

The **LPS Tool** is used for Load, Performance, and Stress testing of web applications. Below is the general usage format:

```bash
lps [command] [options]
```

---

## Global Options

### Options:
- `-n`, `--name`, `--NAME <name>`: Specifies the plan name. Defaults to `Quick-Test-Plan`.
- `-rn`, `--roundname`, `--ROUNDNAME <roundname>`: Specifies the round name. Defaults to `Quick-Test-Round`.
- `-sd`, `--startupDelay`, `--startupdelay`, `--STARTUPDELAY <startupDelay>`: Adds a startup delay (in seconds) to your round.
- `-nc`, `--numberofclients`, `--NUMBEROFCLIENTS <numberofclients>`: Specifies the number of clients for the test round. Defaults to `1`.
- `-ad`, `--arrivaldelay`, `--ARRIVALDELAY <arrivaldelay>`: Specifies the time in milliseconds to wait before a new client arrives.
- `-dcc`, `--delayclientcreation`, `--DELAYCLIENTCREATION <delayclientcreation>`: Delays client creation until needed.
- `-rip`, `--runinparallel`, `--RUNINPARALLEL <runinparallel>`: Executes your iterations in parallel.
- `-s`, `--save`, `--SAVE`: Saves the test as a YAML or JSON file to disk. Defaults to `False`.
- `-u`, `--url`, `--URL <url>`: Specifies the URL for the test. **Required**.
- `-hm`, `--httpmethod`, `--HTTPMETHOD`, `--method`, `--METHOD <method>`: Specifies the HTTP method. Defaults to `GET`.
- `-h`, `--header`, `--HEADER <header>`: Specifies custom headers for the request.
- `-in`, `--iterationname`, `--ITERATIONNAME <iterationname>`: Specifies the iteration name. Defaults to `Quick-Http-Iteration`.
- `-im`, `--string`, `--STRING <string>`: Defines the iteration mode. Defaults to `R`.
- `-mt`, `--maximizethroughput`, `--MAXIMIZETHROUGHPUT <maximizethroughput>`: Maximizes test throughput.
- `-rc`, `--requestcount`, `--REQUESTCOUNT <requestcount>`: Specifies the number of requests.
- `-d`, `--duration`, `--DURATION <duration>`: Specifies the duration in seconds.
- `-cdt`, `--cooldowntime`, `--COOLDOWNTIME <cooldowntime>`: Specifies the cooldown time in milliseconds.
- `-bs`, `--batchsize`, `--BATCHSIZE <batchsize>`: Specifies the batch size for requests.
- `-hv`, `--httpversion`, `--HTTPVERSION <httpversion>`: Specifies the HTTP version. Defaults to `2.0`.
- `-dhtmler`, `--downloadhtmlembeddedresources`, `--DOWNLOADHTMLEMBEDDEDRESOURCES`: Downloads embedded resources in HTML responses.
- `-sr`, `--saveresponse`, `--SAVERESPONSE <saveresponse>`: Saves HTTP responses.
- `-sh2c`, `--supporth2c`, `--SUPPORTH2C <supporth2c>`: Enables support for HTTP/2 over clear text.
- `-p`, `--payload`, `--PAYLOAD <payload>`: Specifies the request payload.
- `--version`: Shows the version information.
- `-?`, `-h`, `--help`: Displays help and usage information.

---

## Commands

### `create`
#### Description:
Creates a test plan.
#### Usage:
```bash
lps create <config> [options]
```
#### Options:
- `--name <name>`: Specifies the plan name. **Required**.
- `-?`, `-h`, `--help`: Displays help and usage information.

---

### `round`
#### Description:
Creates a new test round.
#### Usage:
```bash
lps round <config> [options]
```
#### Options:
- `-n`, `--name`, `--NAME <name>`: Specifies the round name. **Required**.
- `-burl`, `--baseUrl`, `--baseurl`, `--BASEURL <baseUrl>`: Specifies the base URL of the target endpoint.
- `-sd`, `--startupDelay`, `--startupdelay`, `--STARTUPDELAY <startupDelay>`: Adds a startup delay (in seconds) to your round.
- `-nc`, `--numberofclients`, `--NUMBEROFCLIENTS <numberofclients>`: Specifies the number of clients. **Required**. Defaults to `1`.
- `-ad`, `--arrivaldelay`, `--ARRIVALDELAY <arrivaldelay>`: Specifies the time in milliseconds to wait before each new client arrives.
- `-dcc`, `--delayclientcreation`, `--DELAYCLIENTCREATION <delayclientcreation>`: Delays client creation until needed.
- `-rip`, `--runinparallel`, `--RUNINPARALLEL <runinparallel>`: Executes your iterations in parallel.
- `-t`, `--tag`, `--TAG <tag>`: Adds a tag to the round to execute later by tag(s).
- `-?`, `-h`, `--help`: Displays help and usage information.

---

### `iteration`
#### Description:
Adds an HTTP iteration to a test round.
#### Usage:
```bash
lps iteration <config> [command] [options]
```
#### Options:
- `-rn`, `--roundname`, `--roundName`, `--ROUNDNAME <roundname>`: Specifies the round name.
- `-n`, `--name`, `--NAME <name>`: Specifies the iteration name. **Required**.
- `-im`, `--iterationMode`, `--iterationmode`, `--ITERATIONMODE <iterationMode>`: Defines the iteration mode. **Required**.
- `-sd`, `--startupdelay`, `--STARTUPDELAY <startupdelay>`: Adds a startup delay to your iteration.
- `-mt`, `--maximizethroughput`, `--MAXIMIZETHROUGHPUT <maximizethroughput>`: Maximizing test throughput. Maximizing the throughput will result in higher CPU and Memory usage [default: False].
- `-rc`, `--requestcount`, `--REQUESTCOUNT <requestcount>`: Specifies the number of requests for the iteration.
- `-d`, `--duration`, `--DURATION <duration>`: Specifies the duration of the iteration.
- `-cdt`, `--cooldowntime`, `--COOLDOWNTIME <cooldowntime>`: Specifies the cooldown time in milliseconds.
- `-bs`, `--batchsize`, `--BATCHSIZE <batchsize>`: Specifies the batch size for the iteration.
- `-hm`, `--httpmethod`, `--HTTPMETHOD`, `--method`, `--METHOD <method>`: Specifies the HTTP method. **Required**.
- `-hv`, `--httpversion`, `--HTTPVERSION <httpversion>`: Specifies the HTTP version. Defaults to `2.0`.
- `-u`, `--url`, `--URL <url>`: Specifies the URL for the iteration. **Required**.
- `-dhtmler`, `--downloadhtmlembeddedresources`, `--DOWNLOADHTMLEMBEDDEDRESOURCES`: Downloads embedded resources in HTML responses.
- `-sr`, `--saveresponse`, `--SAVERESPONSE <saveresponse>`: Saves HTTP responses.
- `-h2c`, `--supporth2c`, `--SUPPORTH2C <supporth2c>`: Enables support for HTTP/2 over clear text.
- `-h`, `--header`, `--HEADER <header>`: Specifies headers for the iteration.
- `-p`, `--payload`, `--PAYLOAD <payload>`: Specifies the request payload.
- `-g`, `--global`, `--GLOBAL`: Saves as a global iteration. Defaults to `False`.
- `-?`, `-h`, `--help`: Displays help and usage information.

---

### `capture`
#### Description:
Enables the capture of HTTP response and stores it in a variable.
#### Usage:
```bash
lps capture <config> [options]
```
#### Options:
- `-in`, `--iterationname`, `--ITERATIONNAME <iterationname>`: Specifies the iteration name. **Required**.
- `-rn`, `--roundName`, `--roundname`, `--ROUNDNAME <roundName>`: Specifies the round name.
- `-to`, `--TO <to>`: Specifies the variable name to store the response. **Required**.
- `-h`, `--header`, `--HEADER <header>`: Specifies headers for the response.
- `-as`, `--AS <as>`: Reads the variable as (Text, JSON, or XML).
- `-mg`, `--makeGlobal`, `--makeglobal`, `--MAKEGLOBAL <makeGlobal>`: Stores the response as a global variable.
- `-r`, `--regex`, `--REGEX <regex>`: Applies a regex to the captured value.
- `-?`, `-h`, `--help`: Displays help and usage information.

---

### `variable`
#### Description:
Creates a global variable.
#### Usage:
```bash
lps variable <config> [options]
```
#### Options:
- `-n`, `--name`, `--NAME <name>`: Specifies the variable name. **Required**.
- `-e`, `--environment`, `--ENVIRONMENT <environment>`: Specifies the environment(s) for the variable.
- `-v`, `--value`, `--VALUE <value>`: Specifies the variable value. **Required**.
- `-as`, `--AS <as>`: Reads the variable as (Text, JSON, XML or CSV).
- `-r`, `--regex`, `--REGEX <regex>`: Applies a regex to the variable value.
- `-?`, `-h`, `--help`: Displays help and usage information.

@echo off
rem nz — Windows shim. Invokes node on the adjacent `nz` file (which uses
rem a `#!/usr/bin/env node` shebang on POSIX but is plain ESM JS that node
rem will run directly here).
setlocal
set "NZ_RUN=1"
node "%~dp0nz" %*
endlocal & exit /b %ERRORLEVEL%

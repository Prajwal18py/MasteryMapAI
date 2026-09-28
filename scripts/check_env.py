import sys, sysconfig, struct

if (
    sys.version_info[:2] != (3, 12)
    or sysconfig.get_config_var("Py_GIL_DISABLED")
    or struct.calcsize("P") != 8
):
    raise SystemExit(
        "Use regular 64-bit Python 3.12. Rename any old .venv folder, then rerun setup.ps1. Do not use free-threaded Python."
    )
print("Python", sys.version.split()[0], "at", sys.executable)

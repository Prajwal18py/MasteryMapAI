"""Personal browser practice runner; not a secure or tamper-proof grading sandbox."""
import contextlib
import io
import traceback

def run_student(source, tests, entry="solve", mode="tests"):
    class LimitedOutput(io.StringIO):
        def write(self, value):
            if self.tell() + len(value) > 16000:
                raise RuntimeError("Output limit exceeded (16,000 characters).")
            return super().write(value)
    capture = LimitedOutput()
    results = []
    def no_input(*args):
        raise RuntimeError("Interactive input() is unavailable here. Set sample values in your code or pass them as function arguments.")
    namespace = {"__name__": "__main__", "input": no_input}
    def error_info(error):
        frames = traceback.extract_tb(error.__traceback__)
        student = [f for f in frames if f.filename == "student.py"]
        line = getattr(error, "lineno", None) or (student[-1].lineno if student else None)
        return {"error": f"{type(error).__name__}: {error}", "line": line,
                "details": ''.join(traceback.format_exception(type(error), error, error.__traceback__))[-4000:]}
    try:
        with contextlib.redirect_stdout(capture), contextlib.redirect_stderr(capture):
            exec(compile(source, "student.py", "exec"), namespace)
            if mode == "tests":
                function = namespace.get(entry)
                if not callable(function):
                    names = [name for name, val in namespace.items() if callable(val) and getattr(val, "__module__", None) == "__main__"]
                    hint = f" Found: {', '.join(names[:5])}. Change 'Function to test' to your function name, or rename your function to {entry}." if names else f" Define def {entry}(...) and return your result."
                    raise ValueError(f"Tests could not find a callable named {entry}." + hint)
                for test in tests:
                    try:
                        actual = function(*test["input"])
                        results.append({"passed": bool(actual == test["expected"]), "actual": repr(actual)[:500], "expected": test["expected"], "input":test["input"]})
                    except BaseException as error:
                        results.append({"passed":False,"expected":test["expected"],"input":test["input"], **error_info(error)})
        return {"results":results,"passed":sum(x["passed"] for x in results),"total":len(results),"stdout":capture.getvalue(),"mode":mode}
    except BaseException as error:
        return {"results":results,"passed":sum(x["passed"] for x in results),"total":len(tests) if mode == "tests" else 0,"stdout":capture.getvalue(),"mode":mode,**error_info(error)}

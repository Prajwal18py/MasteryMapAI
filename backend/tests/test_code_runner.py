import runpy, unittest
from pathlib import Path
run_student=runpy.run_path(str(Path(__file__).resolve().parents[2]/'frontend/public/python-runner.py'))['run_student']
class CodeRunnerTests(unittest.TestCase):
 def test_named_function_message_and_custom_entry(self):
  code='def pos(arr):\n    return sum(x for x in arr if x>0)'
  tests=[{'input':[[1,-2,3]],'expected':4}]
  r=run_student(code,tests);self.assertIn('Found: pos',r['error']);self.assertNotIn('pyodide',r['error'])
  self.assertEqual(run_student(code,tests,'pos')['passed'],1)
 def test_syntax_error_line(self):
  r=run_student('def solve(x):\nreturn x',[])
  self.assertEqual(r['line'],2);self.assertIn('IndentationError',r['error'])
 def test_script_mode_and_output(self):
  self.assertEqual(run_student('print(2+3)',[],mode='script')['stdout'],'5\n')
 def test_failure_is_not_a_pass(self):
  r=run_student('def solve(x):\n    return 0',[{'input':[1],'expected':2}]);self.assertEqual(r['passed'],0)
 def test_return_vs_print(self):
  r=run_student('def solve(x):\n    print(x)',[{'input':[2],'expected':2}]);self.assertEqual(r['passed'],0);self.assertEqual(r['stdout'],'2\n')
 def test_runtime_error(self):
  r=run_student('def solve(x):\n    return 1/0',[{'input':[1],'expected':1}]);self.assertEqual(r['results'][0]['line'],2)

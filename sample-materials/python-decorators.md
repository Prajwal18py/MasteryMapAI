# Python: Functions, Closures and Decorators

## Functions
Functions are reusable blocks of code. A function without an executed return statement returns None. Printing a value displays it, while returning a value passes it back to the caller.

## Higher-order functions
A higher-order function accepts another function or returns one. Passing `square` passes a callable; passing `square(4)` first calls it and passes its result.

## Closures
A closure retains access to variables from its enclosing lexical scope after the enclosing function returns.

## Decorators
A decorator takes a function and returns a replacement callable. Writing `@log` above `def work()` is equivalent to `work = log(work)`.
A wrapper should return `func(*args, **kwargs)` to preserve the original result. Without return, the wrapper implicitly returns None.
Stacked decorators are applied from bottom to top: `@first` above `@second` produces `first(second(function))`.

## Classes and methods
Instance methods receive an instance as their first argument, conventionally named self. A classmethod receives the class as cls. A staticmethod receives neither automatically.

## Generators and exceptions
A generator yields values lazily. After exhaustion, next() raises StopIteration. A finally block runs on leaving a try construct; an else block runs when the try completes without an exception.

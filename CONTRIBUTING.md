# Contributing to Cheerio

Thanks for your interest in contributing to the project! Here's a rundown of
how we'd like to work with you:
TESTING

1.  File an issue on GitHub describing the contribution you'd like to make. This
    will help us to get you started on the right foot.
2.  Create a single commit that addresses the issue:
    1.  Follow the project's code style (see below)
    2.  Add enough unit tests to "prove" that your patch is correct
    3.  Update the project documentation as needed (see below)
    4.  Describe your approach with as much detail as necessary in the git
        commit message
3.  Open a pull request, and reference the initial issue in the pull request
    message.

# Documentation

Any API change should be reflected in the project's README.md file. Reuse
[jQuery's documentation](https://api.jquery.com) wherever possible, but take
care to note aspects that make Cheerio distinct.

# Code Style

Please make sure commit hooks are run, which will enforce the code style.

When implementing private functionality that isn't part of the jQuery API, please opt for:

- _Static methods_: If the functionality does not require a reference to a
  Cheerio instance, simply define a named function within the module it is
  needed.
- _Instance methods_: If the functionality requires a reference to a Cheerio
  instance, informally define the method as "private" using the following
  conventions:
  - Define the method as a function on the Cheerio prototype
  - Prefix the method name with an underscore (`_`) character
  - Include `@api private` in the code comment the documents the method

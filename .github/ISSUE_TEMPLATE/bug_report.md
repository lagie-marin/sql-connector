---
name: Bug report
about: Create a report to help us improve
title: ''
labels: ''
assignees: lagie-marin

---

## Bug Description

## Steps to Reproduce

1. Call the method `...`
2. Pass the following options/parameters `...`
3. Execute the code
4. See the error

## Code Snippet / Logs

**JavaScript Code:**

```javascript
// Insert the JavaScript code that triggers the issue here
const result = await MyModel.find({ ... });
```

## Error Logs / Output

```txt
TypeError: ... is not a function
    at ...
```

## Expected Behavior

Example: The `find()` method should return a native JavaScript Array of `ModelInstance` objects so that `.length` or indexation like `[0]` works out of the box when multiple rows are returned.

## Environment

- sql-connector version: vX.X.X
- Node.js version: vXX.XX.X
- Database (MySQL/MariaDB...): MySQL vX.X

---
name: Feature request
about: Suggest an idea for this project
title: ''
labels: ''
assignees: lagie-marin

---

## Feature Type
- [ ] New method / API addition
- [ ] Performance improvement
- [ ] Architecture Refactoring (ORM / Data Mapping)
- [ ] Other: 

## Problem Statement
*Example: Currently, the ORM wraps the raw driver payload `[rows, fields]` inside a single global `ModelInstance`. This forces developers to leak internal database structure by accessing nested arrays like `data[0][0]` when handling records, destroying proper encapsulation.*

## Proposed Solution
*Example: Refactor the `find()` method to map and split the query results. It should return a native Array where each row is mapped into its own independent `ModelInstance`. Implement dynamic data-mapping (via continuous references, Getters/Setters, or a Proxy) to allow direct property access (`job.status`) without cloning the memory footprint.*

## Desired Developer Experience (DX / Example)
```javascript
// Provide an example of how the ideal code should look after this feature:
const jobs = await InjectionJobs.find({ where: { status: "running" } });

console.log(jobs.length);    // Native array length works
console.log(jobs[0].status); // Direct property access on the instance
await jobs[0].updateOne({ status: "success" }); // Instance methods remain fully bound

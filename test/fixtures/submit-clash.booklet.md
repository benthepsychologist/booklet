---
booklet: "0.15"
id: test/submit-clash
title: Submit clash test
lang: en
---

# Submit clash test

Two modules that use the same question id: the submit build refuses to send their answers as one map.

> [!module|part-a] Part A

> [!activity|a-items] Part A

> [!text|item1] A question

> [!module|part-a end]

> [!module|part-b] Part B

> [!activity|b-items] Part B

> [!text|item1] The same id in another module

> [!module|part-b end]

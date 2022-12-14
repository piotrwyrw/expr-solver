# expr-solver
<span style="color: lightgray;">v22.10.22</span>
<br><br>
A boolean-expression solver implemented in NodeJS.

<br>

### Usage

---

Solve the expression `!a&b&c`
```bash
node . --expression  "!a&b&c"
```

Solve the expression `(a & !b) | (!a & b)` and show the parser output.
```bash
node . --expression "(a & !b) | (!a & b)" --show-ast
```

The variable's values resulting in positive outputs are highlighted on the
truth table (positive values in green, negative in red).

<br>

### Logical operators

---

|     |  Description  |  Precedence  |
|-----|---------------|--------------|
|  \| | OR            | LOW
|  >  | Implication   | LOW
|  &  | AND           | HIGH
|  !  | Not           | HIGHEST


<br><br>

## Changelog
<br>
Literal (immediate) values

---

Since version 7.10.22.2 the expressions may contain immediate (or literal)
values. These values can be either `0` (zero / false / negative) or `1` (one / true / positive).
<br>
Example expression:
```
!0 & ((!a & b) | (a & !b))
```
<br>
<br>
Maintenance 22/10/2022

---

1) The variables in the truth table are now sorted to avoid any confusion when comparing tables
2) The logical implication operator `>` was added
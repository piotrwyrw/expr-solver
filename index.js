const colors = require('colors')

const vn = Array.from(Array('q'.charCodeAt(0) - 'a'.charCodeAt(0))).map((v, i) => {
    return 'a'.charCodeAt(0) + i
}).map((v, i) => String.fromCharCode(v))

console.log(vn)

class Parser {
    currTok = null
    nextTok = null
    tokenPtr = 0

    constructor(input) {
        this.input = input

        // Load the tokens into memory
        this.consumeToken()
        this.consumeToken()
    }

    consumeToken() {
        this.currTok = this.nextTok
        this.nextTok = (this.tokenPtr + 1 > this.input.length) ? null : this.input[this.tokenPtr ++]
    }

    hasNext() {
        return this.nextTok === null
    }

    canConsume() {
        return this.tokenPtr + 1 <= this.input.length
    }

    parseVariable() {
        if (!isLetter(this.currTok)) {
            throw `The variable name has to be a single letter -- Got "${this.currTok}"`
        }
        return {
            variable: {
                where: this.tokenPtr,
                name: this.currTok
            }
        }
    }

    parseAny() {
        let expr = this.parseBinaryExpressionFirst()
        return expr
    }

    parseBinaryExpressionFirst() {
        let left = this.parseBinaryExpressionSecond();

        if (this.nextTok === '|' || this.nextTok === '^')
            this.consumeToken()

        while (this.currTok === '|' || this.currTok === '^') {
            let _type = this.currTok
            this.consumeToken()
            let right = this.parseBinaryExpressionFirst()
            left = {
                binary: {
                    where: this.tokenPtr,
                    type: (_type === '|') ? 'or' : 'xor',
                    left,
                    right
                }
            }
            if (this.nextTok === '|' || this.nextTok === '^')
                this.consumeToken()
        }

        return left
    }

    parseBinaryExpressionSecond() {
        let left = this.parseFactor();

        if (this.nextTok === '&')
            this.consumeToken()

        while (this.currTok === '&') {
            this.consumeToken()
            let right = this.parseBinaryExpressionSecond()
            left = {
                binary: {
                    where: this.tokenPtr,
                    type: 'and',
                    left,
                    right
                }
            }
            if (this.nextTok === '&')
                this.consumeToken()
        }

        return left
    }

    parseFactor() {
        let not = false;

        if (this.currTok === '!') {
            not = true;
            this.consumeToken()
        }

        let expression = null;

        if (isLetter(this.currTok))
            expression = this.parseVariable()
        else if (this.currTok === '(')
            expression = this.parseSubexpression()
        else
            throw `Expected a variable or a subexpression -- Got ${this.currTok}`

        if (not)
            return {
                invert: {
                    expression
                }
            }

        return expression
    }

    parseSubexpression() {
        this.consumeToken()
        let expr = this.parseAny()
        this.consumeToken()
        if (this.currTok !== ')')
            throw `Expected a ")" after the expression -- Got "${this.currTok}"`
        return expr
    }

}


/**
 * Validate and prepare the input for processing
 */

const args = process.argv.slice(2)

if (args.length !== 1) {
    throw 'Expected 1 argument: Input expression.'
}

args[0] = args[0].replace(/\s/g,'')


/**
 * Parse the expression
 */

const parser = new Parser(args[0])

console.log('Parsing the expression ..')

let parseResult = parser.parseAny()

if (parser.nextTok !== null)
    throw 'Token buffer is not empty -- Possible syntax errors.'

console.log('Resulting abstract syntax tree:')
console.log(JSON.stringify(parseResult, null, 4))

let v = individuate(findVariables(parseResult))
console.log(`Referenced variables: ${v}`)

for (let i = 0; i < v.length; i ++)
    if (!vn.includes(v[i]))
        throw `Unknown variable: ${v[i]}. Legal identifiers: ${vn}`

/**
 * Generate the truth table
 */

const variables = []

for (let i = 0; i < v; i ++)
    variables[i] = 0

truthTable(parseResult)

function truthTable(expr) {
    process.stdout.write('AST-Based expression reconstruction: ')
    solve(expr, true)
    console.log('')

    for (let i = 0; i < v.length; i ++)
        process.stdout.write(`${'a' + i}   `)
    console.log('Q')

    for (let a = 0; a < 2; a++)
        for (let b = 0; b < 2; b++)
            for (let c = 0; c < 2; c++) {
                variables['a'] = a
                variables['b'] = b
                variables['c'] = c

                let res = solve(expr)

                console.log(applyColor(res, variables['a']) + '   ' + applyColor(res, variables['b']) + '   ' + applyColor(res, variables['c']) + '   ' + (res ? '1'.green : '0'.red))
            }
}


/**
 * Solving logic
 */

function solve(part, write) {

    if (typeof write === 'undefined')
        write = false

    let keys = Object.keys(part)

    if (keys.length !== 1)
        throw 'Too many keys.'

    if (keys.includes('binary'))
        return solveBinary(part.binary, write)

    if (keys.includes('variable'))
        return solveVariable(part.variable, write)

    if (keys.includes('invert')) {
        if (write)
            process.stdout.write('!')
        let expr = solve(part.invert.expression, write)
        return !expr
    }

    throw 'Unknown node type: ' + keys

}

function solveBinary(binary, write) {
    if (write) process.stdout.write('(')
    let left = solve(binary.left, write)

    if (binary.type === 'or' && write)
        process.stdout.write('|')

    if (binary.type === 'and' && write)
        process.stdout.write('&')

    if (binary.type === 'xor' && write)
        process.stdout.write('^')

    let right = solve(binary.right, write)

    if (write) process.stdout.write(')')

    if (binary.type === 'or')
        return left || right
    else if (binary.type === 'and')
        return left && right
    else if (binary.type === 'xor')
        return (left && !right) || (!left && right)
    else
        throw 'Binary operation type must either be "or", "and", or "xor"'
}

function solveVariable(variable, write) {
    let name = variable.name
    if (write) process.stdout.write(name)
    return variables[name]
}


/**
 * Examine the expression to find all variables
 */

function findVariables(part) {

    let keys = Object.keys(part)

    if (keys.length !== 1)
        throw 'Too many keys.'

    if (keys.includes('binary')) {
        return mergeArrays (
            findVariables(part.binary.left),
            findVariables(part.binary.right)
        )
    }

    if (keys.includes('variable'))
        return part.variable.name

    if (keys.includes('invert'))
        return findVariables(part.invert.expression)

    throw 'Unknown node type: ' + keys

}


/**
 * Array utility functions
 */

function mergeArrays(a, b) {
    let out = []
    for (let i = 0; i < a.length; i++) {
        out.push(a[i])
    }
    for (let i = 0; i < b.length; i++) {
        out.push(b[i])
    }
    return out
}

function individuate(a) {
    let out = []
    for (let i = 0; i < a.length; i ++) {
        if (out.includes(a[i]))
            continue
        out.push(a[i])
    }
    return out
}



/**
 * Utility functions
 */

function applyColor(res, v) {
    if (res)
        return (v ? v.toString().green : v.toString().red)
    return v
}

function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
}

function computeRequiredBinaryDigits(num) {
    return Math.floor(
        Math.log2(num)
    ) + 1
}

function binaryOf(num, digits) {
    let bitmask = 1
    let arr = []
    for (let i = 0; i < digits; i ++) {
        arr.push((num & (bitmask << i)) > 0 ? 1 : 0)
    }
    return arr
}

function reverse(arr) {
    let cpy = Array.from(arr)
    return arr.map((value, index) => cpy[arr.length - index - 1])
}

function generateBinary(var_ct) {
    arr = []
    for (let i = 0; i < 2 ** var_ct; i ++)
        arr.push( reverse(binaryOf(i, 8)) )
    return arr
}

console.log(generateBinary(2))
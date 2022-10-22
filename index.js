import { Parser } from './parser.js'
import 'colors'

const vn = Array.from(Array('q'.charCodeAt(0) - 'a'.charCodeAt(0))).map((v, i) => {
    return 'a'.charCodeAt(0) + i
}).map((v, i) => String.fromCharCode(v))


/**
 * Validate and prepare the input for processing
 */

const args = process.argv.slice(2)

let expression = null
let show_ast = false

for (let i = 0; i < args.length; i ++) {

    if (i + 1 < args.length && args[i] === '--expression') {
        if (expression !== null)
            throw 'Expression had already been specified.'

        i ++
        expression = args[i]
        continue
    }
    if (args[i] === '--show-ast') {
        show_ast = true
        continue
    }

}

if (expression === null)
    throw 'Missing --expression parameter.'

expression = expression.replace(/\s/g,'')

/**
 * Parse the expression
 */

const parser = new Parser(expression)

console.log('Parsing the expression ..')

let parseResult = parser.parseAny()

if (parser.nextTok !== null)
    throw 'Token buffer is not empty -- Possible syntax errors.'

if (show_ast) {
    console.log('Resulting abstract syntax tree:')
    console.log(JSON.stringify(parseResult, null, 4))
}

let v = individuate(findVariables(parseResult)).sort()
console.log(`Referenced variables: ${v} (${v.length})`)
if (v.length === 0)
    console.log('Warning: This expression only consists of immediate values and hence has a single solution.')

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
    process.stdout.write('Explicit precedence: ')
    solve(expr, true)
    console.log()
    console.log('_'.repeat(25))

    let b = generateBinary(v.length)

    b.forEach((e, superidx) => {
        let bin = e

        bin.forEach((digit, idx) => {
            variables[v[idx]] = digit
        })

        if (bin.length === 0)
            process.stdout.write('[no var. inputs] ')

        let res = solve(expr)
        printVariableArray(res, bin)
        console.log(`--> ${(res) ? '1'.green : '0'.red}`)
    })
}

function printVariableArray(res, bin) {
    bin.forEach((digit, index) => {
        process.stdout.write(`${v[index]}(${digit ? ( res ? '1'.green : '1') : (res ? '0'.red : '0')}) `)
    })
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

    if (keys.includes('literal')) {
        if (write)
            process.stdout.write(part.literal.bool == '1' ? '1' : '0')
        return part.literal.bool == '1'
    }

    if (keys.includes('invert')) {
        if (write)
            process.stdout.write('!(')
        let expr = solve(part.invert.expression, write)
        if (write)
            process.stdout.write(')')
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
    else if (binary.type === 'imply')
        return (!left) ? 1 : right;
    else
        throw 'Binary operation type must either be "or", "and", "xor" or "imply"'
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

    if (keys.includes('literal'))
        return []

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

// function computeRequiredBinaryDigits(num) {
//     return Math.floor(
//         Math.log2(num)
//     ) + 1
// }

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
    let arr = []
    for (let i = 0; i < 2 ** var_ct; i ++)
        arr.push( reverse(binaryOf(i, var_ct)) )
    return arr
}
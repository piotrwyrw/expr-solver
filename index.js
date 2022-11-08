import { isLetter, Parser } from './parser.js'
import { generateBinary, reverse, binaryOf, applyColor, mergeArrays, individuate } from './util.js'
import 'colors'

/**
 * Validate and prepare the input for processing
 */

const args = process.argv.slice(2)

let expression = null
let show_ast = false
let minTerms = []

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

v.forEach((v) => {
    if (!isLetter(v))
        throw `Illegal identifier: ${v}. Only letters are allowed.`
})

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

        if(res) minTerms.push(superidx);
        printVariableArray(res, bin)
        console.log(`--> ${(res) ? '1'.green : '0'.red}`)
    })

    let varCount = Object.keys(variables).length;
    simpl_main(varCount, minTerms)


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

function add(m, n) {
    let len = m.length, buff = '', count = 0, i;
    for (i = 0; i < len; i++) {
        if (m[i] == n[i])
            buff += m[i];
        else if (m[i] != n[i]) {
            count += 1;
            buff += '-';
        }
    }

    if (count > 1)
        return "";


    return buff;
}

function decimalToBinary(variableCount, minterms) {
    let binaryMinterms = [];
    for (let i = 0; i < minterms.length; i++) {
        let binary = minterms[i].toString(2);
        let binaryLength = binary.length;
        let temp = [];
        for (let j = 0; j < variableCount - binaryLength; j++) {
            temp.push(0);
        }
        for (let j = 0; j < binaryLength; j++) {
            temp.push(parseInt(binary[j]));
        }
        binaryMinterms.push(temp);
    }
    return binaryMinterms;
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

    if (binary.type === 'imply' && write)
        process.stdout.write('>')

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


function rep(n, count) {
    let arr = [],
        checkRec = (i) => {
            if (i > 1) {
                checkRec(i - 1);
            }

            arr.push(n);
        };
    checkRec(count);
    return arr;
}



function findImplicants(data) {
    let arr = [].concat(data),
        size = arr.length,
        im = [],
        implicants = [],
        im2 = [],
        mr = rep(0, size),
        mr2,
        m = 0;

    for (let i = 0; i < size; i++)
        for (let j = i + 1; j < size; j++) {
            let c = add(arr[i], arr[j]);
            if (c !== "") {
                im.push(c);
                mr[i] = 1;
                mr[j] = 1;
            }
        }


    mr2 = rep(0, im.length);
    for (let j = 0; j < im.length; j++)
        for (let n = j + 1; n < im.length; n++) if (j !== n && mr2[n] === 0 && im[j] === im[n]) mr2[n] = 1;


    for (let l = 0; l < size; l++) {
        if (mr[l] === 0) {
            implicants.push(arr[l]);
            m++;
        }
    }

    for (let k = 0; k < im.length; k++) if (mr2[k] === 0) im2.push(im[k]);


    if (m !== size && size !== 1)
        implicants = implicants.concat(findImplicants(im2));


    implicants.sort();
    return implicants;
}



function simpl_main(variableCount, minterms) {
    if(minterms.length === 0) {
        console.log("Simplified Version: 0")
    } else if(minterms.length === Math.pow(2, variableCount)) {
        console.log("Simplified Version: 1")
    } else {
        const binaryMinterms = decimalToBinary(variableCount, minterms);
        const primeImplicants = findImplicants(binaryMinterms);


        let vars = Object.keys(variables)

        console.log("Prime Implicants: " + primeImplicants)
        process.stdout.write("Simplified Version: ");
        primeImplicants.reverse()
        primeImplicants.map(i => String(i))
        primeImplicants.forEach((implicant, i1) => {
            if(typeof implicant == "object") {
                implicant.forEach((c, i) => {
                    if(c === '-') return;
                    if(c === 0) process.stdout.write("!")
                    process.stdout.write(vars[i]);
                })
            } else {
                implicant.split("").forEach((c, i) => {
                    if(c === '-') return;
                    if(c === '0') process.stdout.write("!")
                    process.stdout.write(vars[i]);
                })
            }

            if(i1 !== primeImplicants.length - 1) {
                process.stdout.write("|");
            }

        })
    }
}
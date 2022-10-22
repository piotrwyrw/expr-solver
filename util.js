/**
 * Utility functions
 */

export function applyColor(res, v) {
    if (res)
        return (v ? v.toString().green : v.toString().red)
    return v
}

export function binaryOf(num, digits) {
    let bitmask = 1
    let arr = []
    for (let i = 0; i < digits; i ++) {
        arr.push((num & (bitmask << i)) > 0 ? 1 : 0)
    }
    return arr
}

export function reverse(arr) {
    let cpy = Array.from(arr)
    return arr.map((value, index) => cpy[arr.length - index - 1])
}

export function generateBinary(var_ct) {
    let arr = []
    for (let i = 0; i < 2 ** var_ct; i ++)
        arr.push( reverse(binaryOf(i, var_ct)) )
    return arr
}

/**
 * Array utility functions
 */

export function mergeArrays(a, b) {
    let out = []
    for (let i = 0; i < a.length; i++) {
        out.push(a[i])
    }
    for (let i = 0; i < b.length; i++) {
        out.push(b[i])
    }
    return out
}

export function individuate(a) {
    let out = []
    for (let i = 0; i < a.length; i ++) {
        if (out.includes(a[i]))
            continue
        out.push(a[i])
    }
    return out
}
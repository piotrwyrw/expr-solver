export class Parser {
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

        if (['|', '^', '>'].includes(this.nextTok))
            this.consumeToken()

        while (['|', '^', '>'].includes(this.currTok)) {
            let _type = this.currTok
            this.consumeToken()
            let right = this.parseBinaryExpressionFirst()
            left = {
                binary: {
                    where: this.tokenPtr,
                    type: (_type === '|') ? 'or' : ((_type === '^') ? 'xor' : 'imply'),
                    left,
                    right
                }
            }
            if (['|', '^', '>'].includes(this.nextTok))
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

        if (['1', '0'].includes(this.currTok)) {
            return {
                literal: {
                    bool: (not) ? !(this.currTok == '1') : this.currTok == '1'
                }
            }
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
                invert: { expression }
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

export function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
}
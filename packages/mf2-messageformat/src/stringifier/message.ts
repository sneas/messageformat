import { isValidUnquotedLiteral } from '../cst-parser/index.js';
import {
  Declaration,
  isPatternMessage,
  isSelectMessage,
  Message,
  Pattern
} from '../data-model';
import { MessageFormat } from '../messageformat';
import {
  Expression,
  FunctionRef,
  isLiteral,
  isText,
  isVariableRef,
  Literal,
  Option,
  VariableRef
} from '../pattern';
import { functionRefSourceName } from '../pattern/function-ref';

/**
 * Stringify a message using its syntax representation.
 *
 * @beta
 */
export function stringifyMessage(msg: Message | MessageFormat) {
  if (msg instanceof MessageFormat) msg = msg.resolvedOptions().message;
  let res = '';
  for (const decl of msg.declarations) res += stringifyDeclaration(decl);
  if (isPatternMessage(msg)) {
    res += stringifyPattern(msg.pattern);
  } else if (isSelectMessage(msg)) {
    res += 'match';
    for (const sel of msg.selectors) res += ' ' + stringifyExpression(sel);
    for (const { keys, value } of msg.variants) {
      res += '\nwhen ';
      for (const key of keys) {
        res += (isLiteral(key) ? stringifyLiteral(key) : '*') + ' ';
      }
      res += stringifyPattern(value);
    }
  }
  return res;
}

function stringifyDeclaration({ target, value }: Declaration) {
  const targetStr = stringifyVariableRef(target);
  const valueStr = stringifyExpression(value);
  return `let ${targetStr} = ${valueStr}\n`;
}

function stringifyFunctionRef({ kind, name, operand, options }: FunctionRef) {
  let res: string;
  if (isLiteral(operand)) {
    res = stringifyLiteral(operand) + ' ';
  } else if (isVariableRef(operand)) {
    res = stringifyVariableRef(operand) + ' ';
  } else {
    res = '';
  }
  res += functionRefSourceName(kind, name);
  if (options) for (const opt of options) res += ' ' + stringifyOption(opt);
  return res;
}

function stringifyLiteral({ quoted, value }: Literal) {
  if (!quoted && isValidUnquotedLiteral(value)) return value;
  const esc = value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  return `|${esc}|`;
}

function stringifyOption(opt: Option) {
  const valueStr = isVariableRef(opt.value)
    ? stringifyVariableRef(opt.value)
    : stringifyLiteral(opt.value);
  return `${opt.name}=${valueStr}`;
}

function stringifyPattern({ body }: Pattern) {
  let res = '';
  for (const el of body) {
    res += isText(el) ? el.value : stringifyExpression(el);
  }
  return `{${res}}`;
}

function stringifyExpression({ body }: Expression) {
  let res: string;
  switch (body.type) {
    case 'function':
      res = stringifyFunctionRef(body);
      break;
    case 'literal':
      res = stringifyLiteral(body);
      break;
    case 'variable':
      res = stringifyVariableRef(body);
      break;
    default:
      res = ''; // bad expression
  }
  return `{${res}}`;
}

function stringifyVariableRef(ref: VariableRef) {
  return '$' + ref.name;
}

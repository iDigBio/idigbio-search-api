import { inherits } from "util";


export function ParameterParseError(message, parameter) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.statusCode = 400;
  this.expose = true;
  this.message = message;
  this.parameter = parameter;
}
inherits(ParameterParseError, Error);

export function TermNotFoundError(message, terms) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.statusCode = 400;
  this.expose = true;
  this.message = message;
  this.terms = terms;
}
inherits(TermNotFoundError, Error);


export function InvalidTypeError(type) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.statusCode = 400;
  this.expose = true;
  this.message = "Invalid type";
  this.type = type;
}
inherits(InvalidTypeError, Error);

function QueryParseError(message, context) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.statusCode = 400;
  this.expose = true;
  this.error = message;
  this.context = context;
}
inherits(QueryParseError, Error);

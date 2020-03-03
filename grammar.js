module.exports = grammar({
  name: 'prolog',

  rules: {
    source_file: $ => repeat($._topLevel),

    _topLevel: $ => choice(
      $.predicate_definition,
      $.directive,
      $.query
    ),

    directive: $ => seq(":-", $.values, "."),

    query: $ => seq("?-", $.values, "."),

    predicate_definition: $ => seq(
      field('head', choice($.atom, $.term)),
      optional(field('body', seq(":-", $.values))),
      "."),

    values: $ => seq(repeat(seq($._value, ",")),
                    $._value),

    term: $ => seq(field('functor', $.atom),
                   "(", field('arguments', $.values), ")"),

    _value: $ => choice(
      $.atom, $.term, $.string, $.list, $.number, $.var,
      $.primitive
    ),

    atom: $ => choice(
      /[a-z][a-zA-Z0-9_]*/,
      /'[^']*'/
    ),

    var: $ => choice(
      /[_A-Z][a-zA-Z0-9_]*/
    ),

    primitive: $ => choice('true', 'false'),

    string: $ => /"[^"]*"/,

    number: $ => choice(
      /[-+]?\d+/,
      /[-+]?\d+\.\d+/,
      /0b[01]+/, // binary
      /0x[0-9a-fA-F]+/, // hex
      /0c[0-7]+/, // octal
      /\d{1,2}'\S+/, // arbitrary radix
      /-?[0-9_]+[/][1-9_]+/,
      /-?[0-9_]+r[1-9_]+/,
      /[+-]?\sd+[.]\sd+Inf/,
    ),

    list: $ => seq(
      "[",
      optional($.values),
      optional(seq("|", $.var)),
      "]",
    )

  }
});

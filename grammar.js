module.exports = grammar({
  name: 'prolog',

  extras: $ => [
    $.comment,
    /\s/
  ],

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

    _simple_value: $ => choice(
      $.atom, $.term, $.string, $.list, $.number, $.var,
      $.primitive, $.char_code, $.dict, $.predicate_name,
    ),


    _value: $ => choice(
      $._simple_value,
      $.unify_op,
    ),

    atom: $ => choice(
      /[a-z][a-zA-Z0-9_]*/,
      /'[^']*'/
    ),

    predicate_name: $ => seq(field('name', $.atom),
                             '/', optional('/'), // DCG
                             field('arity', $.arity)),

    arity: $ => /\d+/,

    var: $ => choice(
      /[_A-Z][a-zA-Z0-9_]*/
    ),

    unify_op: $ => seq(
      $._simple_value, "=", $._simple_value
    ),

    primitive: $ => choice('true', 'false'),

    string: $ => seq(
      '"',
      repeat(choice(
        token.immediate(/[^"\\\n"]+|\\\\r?\n/),
        $.escape_sequence
      )),
      '"'
    ),

    // [TODO] handle pldoc?
    comment: $ => choice(
      seq('%', /.*/),
      seq('/*',
          // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890
          /[^*]*\*+([^/*][^*]*\*+)*/,
          '/')
    ),

    escape_sequence: $ => token.immediate(seq(
      '\\',
      choice(
        /[^xu0-7]/,
        /[0-7]{1,3}/,
        /x[0-9a-fA-F]{2}/,
        /u[0-9a-fA-F]{4}/,
        /u{[0-9a-fA-F]+}/
      )
    )),

    char_code: $ => /0'./,

    number: $ => choice(
      /[-+]?\d+/,
      /[-+]?\d+\.\d+/,
      /0b[01]+/, // binary
      /0x[0-9a-fA-F]+/, // hex
      /0c[0-7]+/, // octal
      /(?:[1-9]|[1-2][0-9]|3[0-6])'[0-9a-fA-F]+/, // arbitrary radix
      /-?[0-9_]+[/][1-9_]+/,
      /-?[0-9_]+r[1-9_]+/,
      /[+-]?\sd+[.]\sd+Inf/,
    ),

    list: $ => seq(
      "[",
      optional($.values),
      optional(field('tail', seq("|", $.var))),
      "]",
    ),

    dict: $ => seq(
      field('tag', choice($.atom, $.var)),
      "{",
      field('entries', optional($.dict_entries)),
      "}"),

    dict_entries: $ => seq(
      repeat(seq($.dict_entry, ",")),
      $.dict_entry,
    ),

    dict_entry: $ => seq(field('key', $.atom), ":", field('value', $._value)),


  }
});

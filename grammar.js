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
      $.dcg_definition,
      $.directive,
      $.query
    ),

    directive: $ => seq(":-", $.values, "."),

    query: $ => seq("?-", $.values, "."),

    predicate_definition: $ => seq(
      optional(seq(field('module', $.atom), ':')),
      field('head', choice($.atom, $.term)),
      optional(field('body', seq(":-", $.values))),
      "."),

    dcg_definition: $ => seq(
      optional(seq(field('module', $.atom), ':')),
      field('head', choice($.atom, $.term)),
      optional(seq(',', field('semicontext', $._value))),
      choice('-->', '-->>'),
      field('body', $.values),
      '.'
    ),

    values: $ => seq(repeat(seq($._value, ",")),
                    $._value),

    term: $ => seq(
      // optional(seq(field('module', $.atom), token.immediate(':'))),
      field('functor', $.atom),
      token.immediate("("),
      field('arguments', $.values),
      ")"),

    _simple_value: $ => prec(6, choice(
      $.atom, $.term, $.string, $.list, $.number, $.var,
      $.primitive, $.char_code, $.dict, $.codes,
    )),

    dict_op_term: $ =>
      seq(
        field(
          'functor',
          alias(token.immediate(
            seq('.',
                choice(
                  //$.atom,
                  /[a-z][a-zA-Z0-9_]*/,
                  /'([^'\\]|(\\.))*'/,
                  token(repeat1(choice('!', '=', '-', '/', '+', '*', '#', '>',
                                       '<', ':', ';', '?', '\\', '^', '@', '$'))),
                  '..'),
                '(')),
                $.atom)),
        field('arguments', $.values),
        ')'),

    dict_operator: $ => seq(
      choice($.var, $.dict, $.dict_operator),
      choice(
        // Need to inline atom & var definitions so we can make them
        // immediate
        alias($.dict_op_term, $.term),
        alias(token.immediate(
          seq('.',
              choice(
                //$.atom,
                /[a-z][a-zA-Z0-9_]*/,
                /'([^'\\]|(\\.))*'/,
                token(repeat1(choice('!', '=', '-', '/', '+', '*', '#', '>',
                                     '<', ':', ';', '?', '\\', '^', '@', '$'))),
                '..'
              ))), $.atom),
        alias(
          token.immediate(
            seq('.',
                // $.var
                /[_A-Z][a-zA-Z0-9_]*/
               )
          ), $.var))),

    _value: $ => choice(
      $.dict_operator,
      $._simple_value,
      $.curly_braced,
      $.parenthesized,
      $.binary_op,
      $.unary_op
    ),

    curly_braced: $ => prec(4, seq('{', optional($.values), '}')),

    parenthesized: $ => seq('(', $.values, ')'),

    atom: $ => choice(
      /[a-z][a-zA-Z0-9_]*/,
      /'([^'\\]|(\\.))*'/,
      $._sym_atom,
      '..'
    ),

    _sym_atom: $ => token(repeat1(choice('!', '=', '-', '/', '+', '*', '#', '>',
                                         '<', ':', ';', '?', '\\', '^', '@', '$'))),

    var: $ => choice(
      /[_A-Z][a-zA-Z0-9_]*/
    ),

    unary_op: $ => prec.left(choice(
      ...[
        // [-1, ['$']],
        //[-2, ['+', '-', '\\']],
        [-9, ['\\+']],
        [-11, ['dynamic', 'discontiguous', 'initialization',
               'meta_predicate', 'module_transparent', 'multifile',
               'public', 'thread_local', 'thread_initialization', 'volatile']]
      ].map(([p, cs]) =>
            prec(p, seq(field('operator', alias(choice(...cs), $.atom)),
                        field('rhs', $._value)))),
      prec(-2, seq(field('operator', $.atom),
                   field('rhs', $._value)))
    )),

    binary_op: $ => choice(
      ...[
        [-2, 'right', ['^', '**']],
        [-4, 'left', ['*', '/', '//', 'div', 'rdiv', '<<', '>>', 'mod', 'rem']],
        [-5, 'left', ['+', '-', '/\\', '\\/', 'xor']],
        [-6, 'right', [':']],
        [-7, 'left', ['<', '=', '=..', '=@=', '\\=@=', '=:=', '=<', '==', '=\\=',
                      '>', '>=', '@<', '@=<', '@>', '@>=', '\\=', '\\==', 'as',
                      'is', '>:<', ':<', '..']],
        [-9, 'left', [':=']],
        [-10, 'right', ['->', '*->']],
        [-11, 'right', [';', '|']]
      ].map(([p, dir, ops]) =>
            prec[dir](
              p,
              seq(field('lhs', $._value),
                  field('operator', alias(choice(...ops), $.atom)),
                  field('rhs', $._value)))),
      // General op
      // just assuming all user-defined ops are right-associative for now
      prec.right(
        -8,
        seq(field('lhs', $._value),
            field('operator', $.atom),
            field('rhs', $._value)))),

    primitive: $ => choice('true', 'false'),

    string: $ => /"(([^"\\])|(\\([^xu0-7]|[0-7]{1,3}|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})))*"/,

    codes: $ => /`(([^`\\])|(\\([^xu0-7]|[0-7]{1,3}|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})))*`/,

    // [TODO] handle pldoc?
    comment: $ => token(prec(1, choice(
      seq('%', /.*/),
      seq('/*',
          /([^*]|(\*+[^/*]))*\*+/,
          '/')))),

    escape_sequence: $ => token.immediate(seq(
      '\\',
      choice(
        /[^xu0-7]/,
        /[0-7]{1,3}/,
        /x[0-9a-fA-F]{2}/,
        /u[0-9a-fA-F]{4}/
      )
    )),

    char_code: $ => seq(
      "0'", choice(token.immediate(/./),
                   alias($.escape_sequence, "."))
    ),

    number: $ => choice(
      /[-+]?[_\d]+/,
      /[-+]?[_\d]+\.[_\d]+/,
      /[-+]?0b[01_]+/, // binary
      /[-+]?0x[0-9a-fA-F_]+/, // hex
      /[-+]?0c[0-7_]+/, // octal
      /[-+]?([1-9]|[1-2][0-9]|3[0-6])'[_0-9a-zA-Z]+/, // arbitrary radix
      /[-+]?[0-9_]+[/][1-9_]+/,
      /[-+]?[0-9_]+r[1-9_]+/,
      /[-+]?([0-9_](\.[0-9_]+)?)+e[0-9_]+/,
      /[-+]?\d+[.]\d+Inf/,
    ),

    list: $ => seq(
      "[",
      optional($.values),
      optional(field('tail', seq("|", $.var))),
      "]",
    ),

    dict: $ => seq(
      field('tag', choice($.atom, $.var)),
      token.immediate("{"),
      field('entries', optional($.dict_entries)),
      "}"),

    dict_entries: $ => seq(
      repeat(seq($.dict_entry, ",")),
      $.dict_entry,
    ),

    dict_entry: $ => seq(field('key', $.atom), ":", field('value', $._value)),

  },


});

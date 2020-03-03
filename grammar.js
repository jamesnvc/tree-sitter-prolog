module.exports = grammar({
  name: 'prolog',

  rules: {
    source_file: $ => repeat($._topLevel),

    _topLevel: $ => choice(
      $.assertion,
      $.query,
      $.predicate_definition
    ),

    assertion: $ => seq(":-", $.terms, "."),

    query: $ => seq("?-", $.terms, "."),

    predicate_definition: $ => seq(
      choice($.functor,
             seq($.functor, ":-", $.terms)),
      "."),

    terms: $ => seq(repeat($.term, ","),
                    $.term),

    functor: $ => choice($.atom,
                         seq($.atom, "(", $.terms, ")")),

    term: $ => choice(
      $.atom, $.functor, $.string, $.list, $.number, $.var,
      $.primitive
    ),

    atom: $ => choice(
      /\p{ID_Start}\p{ID_Continue}*/,
      /'[^']*'/
    ),

    var: $ => choice(
      /_\p{ID_Continue}*/,
      /\p{Lu}\p{ID_Continue}*/
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
      $.terms,
      choice(seq("|", $.var), "]"),
    )

  }
});

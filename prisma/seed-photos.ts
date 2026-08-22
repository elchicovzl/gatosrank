/**
 * Ids de fotos de cataas.com para el seed.
 *
 * Verificados uno por uno con una petición real: de 160 candidatos, 8
 * devolvían error. Si alguno se cae con el tiempo, `pnpm db:seed` va a
 * mostrar una foto rota — se reemplaza y listo, es data de prueba.
 */
export const SEED_PHOTO_IDS = [
  "0C2bQ39x8kuhx31p", "0BTTVEVWXNyOgXYd", "0B2g7aTANObiqPJJ", "0EsIYDG0at0TPpPD",
  "09wFxpacQzvf9jfM", "04eEQhDfAL8l5nt3", "0F0IKAPOdWiE755P", "0mstmOIucwiN80jb",
  "05Xd4JtN14983pns", "0nnJxjVoMK6GVmRS", "0TnOAMpokjANBFVk", "0PJwXcTrNzNIzGBJ",
  "0U4jE41oGuUWThFX", "0M0Lo3dsYft79xNd", "0mxliw1UgtFdDkU8", "0oJmiPshaDZD54M8",
  "0wKeoafTJoIbcem8", "0wPxI2kqnJ4DoAI8", "0XykxsO1fUAZRtPp", "0w0AIO9enndfLoko",
  "0VlkBO6ValjaoeEw", "0y2qESHWnriH1CyH", "0RU7ZkgzyvWv8UJG", "0YOo8tXUKraccqJl",
  "0ztFbDrgDV2K7yJ1", "11yW0nVicWb0fZzo", "14ksbtRkMqKUHxfY", "19Ykh6wwZdgIEL2D",
  "18MD6byVC1yKGpXp", "18T0wqXpU3OiGrUb", "1ANDs65qm2hR9o55", "1AKMzDtX4nlk6w5I",
  "1bJraW0IwSPm3MVd", "0ycVeWWOWgDcGsYC", "1CF7xZmlX0t8QpgP", "1ddeGQUlgfQggW6N",
  "1eGEsddyKNwtBJFP", "1Egt9OiLoKACJHPw", "1frqP6ajw0JzkR1o", "1ihNtm9HkcOub9Li",
  "1JcOo3LnevDdZlcq", "1DrcyohjhwcNaRIz", "1KCTvPEcpY7ryO34", "1KeQpy7eHqi0SFmc",
  "1LlIgMhb3DfoW4qw", "1N2AH31jiY6N9TYc", "1ntkA1kLWffNS2xN", "1NMuf7YAebEz6VTD",
  "1pV0B3MW24cNSOHg", "1q1Ce6mM714NrMKf", "1si02A2ZNdeNH3yo", "1KSwqj0a2mTz5ZrF",
  "1sUjl4nEmh9OHwJz", "1t9Z9QMPYhu5gBDV", "0GC9MRUAqxhBzPyA", "1DvnD0NaGHwHMoml",
  "1TYt4A7YqwaeMUEF", "1wpap8yckt96vOoU", "1y0sv9lnCIIiOiiT", "1Y3dpssxcbHPEkfO",
  "1ZJqBeUSx5hXK3J8", "22tTAaFI1Q33YBGO", "24WlaURCbtQyC5qN", "25esBUofRVePPAN5",
  "1gROXVBHMQ8nLxCQ", "2AjkEyDta2fk44NE", "28ZtVybuyptnWzTM", "2Bb8z8bR1w5EFHhz",
  "2bPYDRuvU70sbgja", "2bnPzTo1hBCSo4rz", "22aAuf1dsGT4uSOi", "2EGeQU9fUQSmO2Te",
  "2eXYJhGolHqOAKaM", "2kKhMn9BCAhMem6V", "2ChLbdjUjjwehaHV", "2LC9Ne6SIMXnIdXZ",
  "2ihCjEch6BVdv8Yx", "2e0FOizQ3iNfwgMh", "2lnVocnpd25cUka7", "2lo2luOySDGPFCng",
  "2MLfyVlPy09vZK5c", "2gakTsWOt6sq3pqS", "2R4fwl2tPwmSwvp1", "2n2is2NLgWTV1smC",
  "1ozkXaGbz1CriQiG", "2LTXz5STKmTHCESu", "2TZUgzYXLM9SzFmX", "2uWNSTyOg2IVBcAL",
  "2VBf3b9iHaTY9vlG", "2tElvyC3TBtGfWsp", "1Y7TMLfxRN6HmCv0", "2VgBUv9MaBwk5qnK",
  "2PhQ92iE2EVNF0ot", "2wfWxhA4oS7bGUFW", "1ZfGU7z1uIdnehgj", "2XYz3V6PILrrvZn6",
  "2xsQpqvspMC4OjXs", "2xkeeR99sD9uaqre", "3B3hpEDNeHSVKii0", "37guCJ2aCCt3m360",
  "3CIF7KHCotN8AYDG", "2y0sOWAIxL640wjB", "299YJTAQz9R6cfGP", "3CxmofIHAkqDJ462",
  "2VcSUtyyFnm45353", "3FFBdyyYOHKQQowl", "3dPi5aA1BG0hOt7a", "3FCDHQs7BeXfx8eu",
  "3I1PIwn7trKWK6Ak", "3le6xKEFrgpI457X", "3k33qCkv5z4j455T", "3lxqpHAJg47Hq0NL",
  "3OI0zHkZS3RCb8xa", "3PGd8RUhmHtkQWvJ", "3pr4EmlAcw5PczC9", "3TzbfBDTo4Mxf676",
  "3UtMAaGn8Tj6EMdW", "3XwXXFnF3WkX5d3D", "3VbMAKLHS9rqK9r1", "3zM2HCQRdiZHB3Oo",
  "3mEJCz1Oj7l1E2tm", "3TFKEWwReMFYYhVM", "3SwrgcdLzYJwd98S", "405B2hIceCnjzrw1",
  "40gQhFUufsfLsLSA", "42aSo5u8xPO2rruI", "43hNBvUK9fAKsHv3", "3xajd1BkJ3RbfSkx",
  "43xBdW7f8F81s3mX", "4CGBn8ySN95C7cG6", "4cnQObJyASFknf5L", "2T7yPn3J5qz54Ygy",
  "4HFPo3TSyFrsWy3s", "4C8ddOpQHfclegrD", "4kdYsRF5rLR1nWWC", "4IMG1eITECEXESQx",
  "4p5bLzdk2T3uZZa9", "4n162YiUp1Jy1utt", "4l7j1U5Qsiq0Zgrx", "4skdDxHm4yDsSJIr",
  "4v9FDCzfJ9WkSn2V", "48xLBZGSXgxZRMAB", "4wziKEvjfJTzZ1cr", "4Fc9nLVSm6FR9t9y",
  "4zJgFagrJcsYIDks", "503m3ZwEJrqFFOQV", "4Z9lKM2FVLpt1Smi", "55j1CyOfwuTFFdvk",
  "5a358s1vHFwHhTFy", "4y6Hyu0uzVZcEx89",
] as const;

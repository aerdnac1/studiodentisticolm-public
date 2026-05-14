(function () {
  var LANG_MAP = { 'it': '/it/', 'en': '/en/' };
  var ALLOWED_PATHS = ['/it/', '/en/'];

  var userLanguages = (navigator.languages ? Array.from(navigator.languages) : [])
    .concat([navigator.language, navigator.userLanguage, navigator.browserLanguage])
    .filter(Boolean);

  var redirectPath = '/en/';

  for (var i = 0; i < userLanguages.length; i++) {
    var langCode = userLanguages[i].split('-')[0].toLowerCase();
    if (LANG_MAP[langCode]) {
      redirectPath = LANG_MAP[langCode];
      break;
    }
  }

  if (ALLOWED_PATHS.indexOf(redirectPath) !== -1) {
    window.location.href = redirectPath;
  }
}());

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports.addPrefixedProperties = addPrefixedProperties;
exports.getPrefixedValue = getPrefixedValue;
exports.getPrefixedProperty = getPrefixedProperty;
exports.caplitalizeString = caplitalizeString;
exports.isPrefixProperty = isPrefixProperty;
exports.resolveHack = resolveHack;
exports.generateRequiredProperties = generateRequiredProperties;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _browserinfo = require('./browserinfo');

var _browserinfo2 = _interopRequireDefault(_browserinfo);

var _caniuseData = require('./caniuseData');

var _caniuseData2 = _interopRequireDefault(_caniuseData);

var _hacks = require('./hacks');

var _hacks2 = _interopRequireDefault(_hacks);

var browserinfo = undefined;
var requiredHacks = [];
var requiredProperties = [];
var defaultUserAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
var lastUserAgent = undefined;
var generated = false;

/**
 * Transforms camel case to dash case (param case)
 * @param {string} str - str that gets transformed
 * Thanks to @ianobermiller for this short method
 * https://github.com/rofrischmann/inline-style-prefixer/issues/9
 */
var CAMEL_CASE_REGEXP = /([a-z])([A-Z])/g;
var camelToDashCase = function camelToDashCase(str) {
	return str.replace(CAMEL_CASE_REGEXP, function (match, p1, p2) {
		return p1 + '-' + p2.toLowerCase();
	});
};

/**
 * Processes an object of styles using userAgent specific
 * @param {Object} styles - Styles object that gets prefixed
 * @param {Boolean} hacks - If hacks should be used to resolve browser differences
 */

exports['default'] = function (styles) {
	var userAgent = arguments.length <= 1 || arguments[1] === undefined ? defaultUserAgent : arguments[1];

	if (lastUserAgent !== userAgent) {
		generated = false;
		generateRequiredProperties(userAgent);
	}

	//only add prefixes if needed
	if (requiredProperties.length > 0) {
		addPrefixedProperties(styles);
	}
	return styles;
};

/**
 * Adds prefixed properties to a style object
 * @param {Object} styles - Style object that gets prefixed properties added
 */

function addPrefixedProperties(styles) {
	Object.keys(styles).forEach(function (property) {
		var value = styles[property];
		if (value instanceof Object) {
			//recursively loop through nested style objects
			addPrefixedProperties(value);
		} else {
			//add prefixes if needed
			if (isPrefixProperty(property)) {
				styles[getPrefixedProperty(property)] = value;
			}
			//resolve hacks
			requiredHacks.forEach(function (hack) {
				resolveHack(hack, styles, property, value);
			});
		}
	});

	return styles;
}

/**
 * Returns a prefixed value
 * Optionaly uses an alternative value
 * @param {string} property - CSS property that gets prefixed
 * @param {any} value - old value that gets prefixed
 * @param {any} alternative - alternative value used for prefixing 
 */

function getPrefixedValue(property, value, alternative) {
	if (alternative) {
		return value.replace(value, browserinfo.prefix.CSS + alternative, 'g') + ';' + camelToDashCase(property) + ':' + value;
	} else {
		return browserinfo.prefix.CSS + value + ';' + camelToDashCase(property) + ':' + value;
	}
}

/**
 * Returns a prefixed style property
 * @param {String} property - a style property in camelCase
 * @param {String} prefix - evaluated vendor prefix that will be added
 */

function getPrefixedProperty(property) {
	return browserinfo.prefix.inline + caplitalizeString(property);
}

/**
 * Capitalizes first letter of a string
 * @param {String} str - str to caplitalize
 */

function caplitalizeString(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Checks if a property needs to be prefixed
 * @param {String} property - a style property
 */

function isPrefixProperty(property) {
	return requiredProperties.indexOf(property) > -1;
}

/**
 * Resolves browser issues using some hacks
 * @param {Object} hackData - contains a condition and properties/values that need to be corrected
 * @param {Object} styles - a style object
 * @param {string} property - property that gets corrected
 * @param {any} value - property value
 */

function resolveHack(hackData, styles, property, value) {

	//prefix ordinary values
	if (hackData.prefixValue) {

		var values = hackData.prefixValue[property];
		if (values) {
			if (hackData.containValue) {
				values.forEach(function (val) {
					if (value.indexOf(val) > -1) {
						styles[property] = getPrefixedValue(property, value, val);
					}
				});
			} else {
				if (values.indexOf(value) > -1) {
					styles[property] = getPrefixedValue(property, value);
				}
			}
		}
	}

	//resolve property issues
	if (hackData.alternativeProperty) {

		var oldProperty = hackData.alternativeProperty[property];
		if (oldProperty) {
			styles[oldProperty] = value;
		}
	}

	//resolve alternative values
	if (hackData.alternativeValue) {

		var oldValue = hackData.alternativeValue[property];
		if (oldValue && oldValue[value]) {
			styles[property] = oldValue[value] + ';' + camelToDashCase(property) + ':' + value;
		}
	}
}

/**
 * Generates an array of all relevant properties according to the userAgent
 * @param {string} userAgent - userAgent which gets used to gather information
 */

function generateRequiredProperties(userAgent) {
	requiredProperties = [];
	requiredHacks = [];

	if (userAgent) {
		browserinfo = (0, _browserinfo2['default'])(userAgent);
		var data = _caniuseData2['default'][browserinfo.browser.toLowerCase()];

		//only generate if there is browser data provided
		if (data) {
			var property = undefined;
			for (property in data) {
				if (data[property] >= browserinfo.version) {
					requiredProperties.push(property);
				}
			}

			//add all required hacks for current browser
			var hack = undefined;
			for (hack in _hacks2['default']) {
				var hackData = _hacks2['default'][hack](browserinfo);
				if (hackData) {
					requiredHacks.push(hackData);
				}
			}

			generated = true;
			return requiredProperties;
		} else {
			console.warn('Your browser seems to not be supported by inline-style-prefixer.');
			console.warn('Please create an issue at https://github.com/rofrischmann/inline-style-prefixer');
			return false;
		}
	} else {
		console.warn('userAgent needs to be set first. Use `.setUserAgent(userAgent)`');
		return false;
	}
}
},{"./browserinfo":2,"./caniuseData":3,"./hacks":4}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _bowser = require('bowser');

var _bowser2 = _interopRequireDefault(_bowser);

var vendorPrefixes = {
	'Webkit': ['chrome', 'safari', 'ios', 'android', 'phantom', 'opera', 'webos', 'blackberry', 'bada', 'tizen'],
	'Moz': ['firefox', 'seamonkey', 'sailfish'],
	'ms': ['msie', 'msedge']
};

var browsers = {
	'chrome': [['chrome'], ['phantom'], ['webos'], ['blackberry'], ['bada'], ['tizenn']],
	'safari': [['safari']],
	'firefox': [['firefox'], ['seamonkey'], ['sailfish']],
	'ie': [['msie'], ['msedge']],
	'opera': [['opera']],
	'ios_saf': [['ios', 'mobile'], ['ios', 'tablet']],
	'ie_mob': [['windowsphone', 'mobile', 'msie'], ['windowsphone', 'tablet', 'msie'], ['windowsphone', 'mobile', 'msedge'], ['windowsphone', 'tablet', 'msedge']],
	'op_mini': [['opera', 'mobile'], ['opera', 'tablet']],
	'and_chr': [['android', 'chrome', 'mobile'], ['android', 'chrome', 'tablet']],
	'and_uc': [['android', 'mobile'], ['android', 'mobile']],
	'android': [['android', 'mobile'], ['android', 'mobile']]
};

/**
 * Uses bowser to get default browser information such as version and name
 * Evaluates bowser info and adds vendorPrefix information
 * @param {string} userAgent - userAgent that gets evaluated
 */

exports['default'] = function (userAgent) {
	var info = _bowser2['default']._detect(userAgent);
	var prefix = undefined;
	for (prefix in vendorPrefixes) {
		vendorPrefixes[prefix].forEach(function (browser) {
			if (info[browser]) {
				info.prefix = {
					inline: prefix,
					CSS: '-' + prefix.toLowerCase() + '-'
				};
			}
		});
	}

	var name = '';
	var browser = undefined;
	for (browser in browsers) {
		browsers[browser].forEach(function (condition) {
			var match = 0;
			condition.forEach(function (single) {
				if (info[single]) {
					match += 1;
				}
			});
			if (condition.length === match) {
				name = browser;
			}
		});
	}

	info.browser = name;
	return info;
};

module.exports = exports['default'];
},{"bowser":11}],3:[function(require,module,exports){
var caniuseData = {"chrome":{"borderRadius":4,"borderImage":15,"borderImageOutset":15,"borderImageRepeat":15,"borderImageSlice":15,"borderImageSource":15,"borderImageWidth":15,"flex":28,"flexBasis":28,"flexDirection":28,"flexGrow":28,"flexFlow":28,"flexShrink":28,"alignContent":28,"alignItems":28,"alignSelf":28,"justifyContent":28,"order":28,"transition":25,"transitionDelay":25,"transitionDuration":25,"transitionProperty":25,"transitionTimingFunction":25,"backfaceVisibility":35,"perspective":35,"perspectiveOrigin":35,"transform":35,"transformOrigin":35,"transformStyle":35,"transformOriginX":35,"transformOriginY":35,"animation":42,"animationDelay":42,"animationDirection":42,"animationFillMode":42,"animationDuration":42,"anmationIterationCount":42,"animationName":42,"animationPlayState":42,"animationTimingFunction":42,"appearance":47,"userSelect":47,"boxSizing":9,"fontKerning":32,"textEmphasisPosition":47,"textEmphasis":47,"textEmphasisStyle":47,"textEmphasisColor":47,"boxDecorationBreak":47,"clipPath":47,"maskImage":47,"maskMode":47,"maskRepeat":47,"maskPosition":47,"maskClip":47,"maskOrigin":47,"maskSize":47,"maskComposite":47,"mask":47,"maskBorderSource":47,"maskBorderMode":47,"maskBorderSlice":47,"maskBorderWidth":47,"maskBorderOutset":47,"maskBorderRepeat":47,"maskBorder":47,"maskType":47,"textDecorationStyle":47,"textDecorationSkip":47,"textDecorationLine":47,"textDecorationColor":47,"filter":47,"flowInto":18,"flowFrom":18,"breakBefore":47,"breakAfter":47,"breakInside":47,"regionFragment":18,"columnGap":47,"fontFeatureSettings":47,"boxShadow":9,"columnCount":47,"columnFill":47,"columnRule":47,"columnRuleColor":47,"columnRuleStyle":47,"columnRuleWidth":47,"columns":47,"columnSpan":47,"columnWidth":47},"safari":{"borderRadius":4,"borderImage":5.1,"borderImageOutset":5.1,"borderImageRepeat":5.1,"borderImageSlice":5.1,"borderImageSource":5.1,"borderImageWidth":5.1,"flex":8,"flexBasis":8,"flexDirection":8,"flexGrow":8,"flexFlow":8,"flexShrink":8,"alignContent":8,"alignItems":8,"alignSelf":8,"justifyContent":8,"order":8,"transition":6,"transitionDelay":6,"transitionDuration":6,"transitionProperty":6,"transitionTimingFunction":6,"backfaceVisibility":8,"perspective":8,"perspectiveOrigin":8,"transform":8,"transformOrigin":8,"transformStyle":8,"transformOriginX":8,"transformOriginY":8,"animation":8,"animationDelay":8,"animationDirection":8,"animationFillMode":8,"animationDuration":8,"anmationIterationCount":8,"animationName":8,"animationPlayState":8,"animationTimingFunction":8,"appearance":9,"userSelect":9,"backdropFilter":9,"boxSizing":5,"fontKerning":9,"scrollSnapType":9,"scrollSnapPointsX":9,"scrollSnapPointsY":9,"scrollSnapDestination":9,"scrollSnapCoordinate":9,"textEmphasisPosition":7,"textEmphasis":7,"textEmphasisStyle":7,"textEmphasisColor":7,"boxDecorationBreak":9,"clipPath":9,"maskImage":9,"maskMode":9,"maskRepeat":9,"maskPosition":9,"maskClip":9,"maskOrigin":9,"maskSize":9,"maskComposite":9,"mask":9,"maskBorderSource":9,"maskBorderMode":9,"maskBorderSlice":9,"maskBorderWidth":9,"maskBorderOutset":9,"maskBorderRepeat":9,"maskBorder":9,"maskType":9,"textDecorationStyle":9,"textDecorationSkip":9,"textDecorationLine":9,"textDecorationColor":9,"shapeImageThreshold":9,"shapeImageMargin":9,"shapeImageOutside":9,"filter":9,"hyphens":9,"flowInto":9,"flowFrom":9,"breakBefore":8,"breakAfter":8,"breakInside":8,"regionFragment":9,"columnGap":8,"boxShadow":5,"columnCount":8,"columnFill":8,"columnRule":8,"columnRuleColor":8,"columnRuleStyle":8,"columnRuleWidth":8,"columns":8,"columnSpan":8,"columnWidth":8},"firefox":{"borderRadius":3.6,"borderImage":14,"borderImageOutset":14,"borderImageRepeat":14,"borderImageSlice":14,"borderImageSource":14,"borderImageWidth":14,"flex":21,"flexBasis":21,"flexDirection":21,"flexGrow":21,"flexFlow":21,"flexShrink":21,"alignContent":21,"alignItems":21,"alignSelf":21,"justifyContent":21,"order":21,"transition":15,"transitionDelay":15,"transitionDuration":15,"transitionProperty":15,"transitionTimingFunction":15,"backfaceVisibility":15,"perspective":15,"perspectiveOrigin":15,"transform":15,"transformOrigin":15,"transformStyle":15,"transformOriginX":15,"transformOriginY":15,"animation":15,"animationDelay":15,"animationDirection":15,"animationFillMode":15,"animationDuration":15,"anmationIterationCount":15,"animationName":15,"animationPlayState":15,"animationTimingFunction":15,"appearance":42,"userSelect":42,"boxSizing":28,"textAlignLast":42,"textDecorationStyle":35,"textDecorationSkip":35,"textDecorationLine":35,"textDecorationColor":35,"tabSize":42,"resize":4,"hyphens":42,"breakBefore":42,"breakAfter":42,"breakInside":42,"columnGap":42,"backgroundClip":3.6,"backgroundOrigin":3.6,"backgroundSize":3.6,"fontFeatureSettings":33,"boxShadow":3.6,"columnCount":42,"columnFill":42,"columnRule":42,"columnRuleColor":42,"columnRuleStyle":42,"columnRuleWidth":42,"columns":42,"columnSpan":42,"columnWidth":42},"opera":{"borderImage":12.1,"borderImageOutset":12.1,"borderImageRepeat":12.1,"borderImageSlice":12.1,"borderImageSource":12.1,"borderImageWidth":12.1,"flex":16,"flexBasis":16,"flexDirection":16,"flexGrow":16,"flexFlow":16,"flexShrink":16,"alignContent":16,"alignItems":16,"alignSelf":16,"justifyContent":16,"order":16,"transition":12,"transitionDelay":12,"transitionDuration":12,"transitionProperty":12,"transitionTimingFunction":12,"backfaceVisibility":22,"perspective":22,"perspectiveOrigin":22,"transform":22,"transformOrigin":22,"transformStyle":22,"transformOriginX":22,"transformOriginY":22,"animation":29,"animationDelay":29,"animationDirection":29,"animationFillMode":29,"animationDuration":29,"anmationIterationCount":29,"animationName":29,"animationPlayState":29,"animationTimingFunction":29,"appearance":32,"userSelect":32,"fontKerning":19,"textEmphasisPosition":32,"textEmphasis":32,"textEmphasisStyle":32,"textEmphasisColor":32,"boxDecorationBreak":32,"clipPath":32,"maskImage":32,"maskMode":32,"maskRepeat":32,"maskPosition":32,"maskClip":32,"maskOrigin":32,"maskSize":32,"maskComposite":32,"mask":32,"maskBorderSource":32,"maskBorderMode":32,"maskBorderSlice":32,"maskBorderWidth":32,"maskBorderOutset":32,"maskBorderRepeat":32,"maskBorder":32,"maskType":32,"tabSize":12.1,"filter":32,"breakBefore":32,"breakAfter":32,"breakInside":32,"columnGap":32,"objectFit":12.1,"objectPosition":12.1,"textOverflow":10.6,"backgroundClip":10,"backgroundOrigin":10,"backgroundSize":10,"fontFeatureSettings":32,"columnCount":32,"columnFill":32,"columnRule":32,"columnRuleColor":32,"columnRuleStyle":32,"columnRuleWidth":32,"columns":32,"columnSpan":32,"columnWidth":32},"ie":{"flex":10,"flexBasis":10,"flexDirection":10,"flexGrow":10,"flexFlow":10,"flexShrink":10,"alignContent":10,"alignItems":10,"alignSelf":10,"justifyContent":10,"order":10,"userSelect":11,"wrapFlow":11,"wrapThrough":11,"wrapMargin":11,"scrollSnapType":11,"scrollSnapPointsX":11,"scrollSnapPointsY":11,"scrollSnapDestination":11,"scrollSnapCoordinate":11,"touchAction":10,"hyphens":11,"flowInto":11,"flowFrom":11,"regionFragment":11,"gridTemplateColumns":11,"gridTemplateRows":11,"gridTemplateAreas":11,"gridTemplate":11,"gridAutoColumns":11,"gridAutoRows":11,"gridAutoFlow":11,"grid":11,"gridRowStart":11,"gridColumnStart":11,"gridRowEnd":11,"gridRow":11,"gridColumn":11,"gridArea":11,"rowGap":11,"gridGap":11},"ios_saf":{"borderRadius":3.2,"borderImage":5,"borderImageOutset":5,"borderImageRepeat":5,"borderImageSlice":5,"borderImageSource":5,"borderImageWidth":5,"flex":8.1,"flexBasis":8.1,"flexDirection":8.1,"flexGrow":8.1,"flexFlow":8.1,"flexShrink":8.1,"alignContent":8.1,"alignItems":8.1,"alignSelf":8.1,"justifyContent":8.1,"order":8.1,"transition":6,"transitionDelay":6,"transitionDuration":6,"transitionProperty":6,"transitionTimingFunction":6,"backfaceVisibility":8.1,"perspective":8.1,"perspectiveOrigin":8.1,"transform":8.1,"transformOrigin":8.1,"transformStyle":8.1,"transformOriginX":8.1,"transformOriginY":8.1,"animation":8.1,"animationDelay":8.1,"animationDirection":8.1,"animationFillMode":8.1,"animationDuration":8.1,"anmationIterationCount":8.1,"animationName":8.1,"animationPlayState":8.1,"animationTimingFunction":8.1,"appearance":9,"userSelect":9,"backdropFilter":9,"boxSizing":4.2,"fontKerning":9,"scrollSnapType":9,"scrollSnapPointsX":9,"scrollSnapPointsY":9,"scrollSnapDestination":9,"scrollSnapCoordinate":9,"boxDecorationBreak":9,"clipPath":9,"maskImage":9,"maskMode":9,"maskRepeat":9,"maskPosition":9,"maskClip":9,"maskOrigin":9,"maskSize":9,"maskComposite":9,"mask":9,"maskBorderSource":9,"maskBorderMode":9,"maskBorderSlice":9,"maskBorderWidth":9,"maskBorderOutset":9,"maskBorderRepeat":9,"maskBorder":9,"maskType":9,"textSizeAdjust":9,"textDecorationStyle":9,"textDecorationSkip":9,"textDecorationLine":9,"textDecorationColor":9,"shapeImageThreshold":9,"shapeImageMargin":9,"shapeImageOutside":9,"filter":9,"hyphens":9,"flowInto":9,"flowFrom":9,"breakBefore":8.1,"breakAfter":8.1,"breakInside":8.1,"regionFragment":9,"columnGap":8.1,"boxShadow":4.2,"columnCount":8.1,"columnFill":8.1,"columnRule":8.1,"columnRuleColor":8.1,"columnRuleStyle":8.1,"columnRuleWidth":8.1,"columns":8.1,"columnSpan":8.1,"columnWidth":8.1},"android":{"borderRadius":2.1,"borderImage":4.2,"borderImageOutset":4.2,"borderImageRepeat":4.2,"borderImageSlice":4.2,"borderImageSource":4.2,"borderImageWidth":4.2,"flex":4.2,"flexBasis":4.2,"flexDirection":4.2,"flexGrow":4.2,"flexFlow":4.2,"flexShrink":4.2,"alignContent":4.2,"alignItems":4.2,"alignSelf":4.2,"justifyContent":4.2,"order":4.2,"transition":4.2,"transitionDelay":4.2,"transitionDuration":4.2,"transitionProperty":4.2,"transitionTimingFunction":4.2,"backfaceVisibility":4.4,"perspective":4.4,"perspectiveOrigin":4.4,"transform":4.4,"transformOrigin":4.4,"transformStyle":4.4,"transformOriginX":4.4,"transformOriginY":4.4,"animation":40,"animationDelay":40,"animationDirection":40,"animationFillMode":40,"animationDuration":40,"anmationIterationCount":40,"animationName":40,"animationPlayState":40,"animationTimingFunction":40,"appearance":40,"userSelect":40,"boxSizing":3,"fontKerning":4.4,"textEmphasisPosition":40,"textEmphasis":40,"textEmphasisStyle":40,"textEmphasisColor":40,"boxDecorationBreak":40,"clipPath":40,"maskImage":40,"maskMode":40,"maskRepeat":40,"maskPosition":40,"maskClip":40,"maskOrigin":40,"maskSize":40,"maskComposite":40,"mask":40,"maskBorderSource":40,"maskBorderMode":40,"maskBorderSlice":40,"maskBorderWidth":40,"maskBorderOutset":40,"maskBorderRepeat":40,"maskBorder":40,"maskType":40,"filter":40,"breakBefore":40,"breakAfter":40,"breakInside":40,"columnGap":40,"backgroundClip":2.3,"backgroundOrigin":2.3,"backgroundSize":2.3,"fontFeatureSettings":40,"boxShadow":3,"columnCount":40,"columnFill":40,"columnRule":40,"columnRuleColor":40,"columnRuleStyle":40,"columnRuleWidth":40,"columns":40,"columnSpan":40,"columnWidth":40},"and_chr":{"animation":42,"animationDelay":42,"animationDirection":42,"animationFillMode":42,"animationDuration":42,"anmationIterationCount":42,"animationName":42,"animationPlayState":42,"animationTimingFunction":42,"appearance":42,"userSelect":42,"textEmphasisPosition":42,"textEmphasis":42,"textEmphasisStyle":42,"textEmphasisColor":42,"boxDecorationBreak":42,"clipPath":42,"maskImage":42,"maskMode":42,"maskRepeat":42,"maskPosition":42,"maskClip":42,"maskOrigin":42,"maskSize":42,"maskComposite":42,"mask":42,"maskBorderSource":42,"maskBorderMode":42,"maskBorderSlice":42,"maskBorderWidth":42,"maskBorderOutset":42,"maskBorderRepeat":42,"maskBorder":42,"maskType":42,"filter":42,"breakBefore":42,"breakAfter":42,"breakInside":42,"columnGap":42,"fontFeatureSettings":42,"columnCount":42,"columnFill":42,"columnRule":42,"columnRuleColor":42,"columnRuleStyle":42,"columnRuleWidth":42,"columns":42,"columnSpan":42,"columnWidth":42},"and_uc":{"flex":9.9,"flexBasis":9.9,"flexDirection":9.9,"flexGrow":9.9,"flexFlow":9.9,"flexShrink":9.9,"alignContent":9.9,"alignItems":9.9,"alignSelf":9.9,"justifyContent":9.9,"order":9.9,"transition":9.9,"transitionDelay":9.9,"transitionDuration":9.9,"transitionProperty":9.9,"transitionTimingFunction":9.9,"backfaceVisibility":9.9,"perspective":9.9,"perspectiveOrigin":9.9,"transform":9.9,"transformOrigin":9.9,"transformStyle":9.9,"transformOriginX":9.9,"transformOriginY":9.9,"animation":9.9,"animationDelay":9.9,"animationDirection":9.9,"animationFillMode":9.9,"animationDuration":9.9,"anmationIterationCount":9.9,"animationName":9.9,"animationPlayState":9.9,"animationTimingFunction":9.9,"appearance":9.9,"userSelect":9.9,"fontKerning":9.9,"textEmphasisPosition":9.9,"textEmphasis":9.9,"textEmphasisStyle":9.9,"textEmphasisColor":9.9,"maskImage":9.9,"maskMode":9.9,"maskRepeat":9.9,"maskPosition":9.9,"maskClip":9.9,"maskOrigin":9.9,"maskSize":9.9,"maskComposite":9.9,"mask":9.9,"maskBorderSource":9.9,"maskBorderMode":9.9,"maskBorderSlice":9.9,"maskBorderWidth":9.9,"maskBorderOutset":9.9,"maskBorderRepeat":9.9,"maskBorder":9.9,"maskType":9.9,"textSizeAdjust":9.9,"filter":9.9,"hyphens":9.9,"flowInto":9.9,"flowFrom":9.9,"breakBefore":9.9,"breakAfter":9.9,"breakInside":9.9,"regionFragment":9.9,"columnGap":9.9,"fontFeatureSettings":9.9,"columnCount":9.9,"columnFill":9.9,"columnRule":9.9,"columnRuleColor":9.9,"columnRuleStyle":9.9,"columnRuleWidth":9.9,"columns":9.9,"columnSpan":9.9,"columnWidth":9.9},"op_mini":{"borderImage":5,"borderImageOutset":5,"borderImageRepeat":5,"borderImageSlice":5,"borderImageSource":5,"borderImageWidth":5,"tabSize":5,"objectFit":5,"objectPosition":5},"ie_mob":{"flex":10,"flexBasis":10,"flexDirection":10,"flexGrow":10,"flexFlow":10,"flexShrink":10,"alignContent":10,"alignItems":10,"alignSelf":10,"justifyContent":10,"order":10,"userSelect":11,"wrapFlow":11,"wrapThrough":11,"wrapMargin":11,"touchAction":10,"textSizeAdjust":11,"flowInto":11,"flowFrom":11,"regionFragment":11,"gridTemplateColumns":11,"gridTemplateRows":11,"gridTemplateAreas":11,"gridTemplate":11,"gridAutoColumns":11,"gridAutoRows":11,"gridAutoFlow":11,"grid":11,"gridRowStart":11,"gridColumnStart":11,"gridRowEnd":11,"gridRow":11,"gridColumn":11,"gridArea":11,"rowGap":11,"gridGap":11}}; module.exports = caniuseData
},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _hacksCursor = require('./hacks/cursor');

var _hacksCursor2 = _interopRequireDefault(_hacksCursor);

var _hacksFlexbox = require('./hacks/flexbox');

var _hacksFlexbox2 = _interopRequireDefault(_hacksFlexbox);

var _hacksSizing = require('./hacks/sizing');

var _hacksSizing2 = _interopRequireDefault(_hacksSizing);

var _hacksGradient = require('./hacks/gradient');

var _hacksGradient2 = _interopRequireDefault(_hacksGradient);

//special flexbox specifications

var _hacksFlexspec2009 = require('./hacks/flexspec/2009');

var _hacksFlexspec20092 = _interopRequireDefault(_hacksFlexspec2009);

var _hacksFlexspec2012 = require('./hacks/flexspec/2012');

var _hacksFlexspec20122 = _interopRequireDefault(_hacksFlexspec2012);

exports['default'] = {
	cursor: _hacksCursor2['default'],
	flexbox: _hacksFlexbox2['default'],
	sizing: _hacksSizing2['default'],
	gradient: _hacksGradient2['default'],
	flexbox2009: _hacksFlexspec20092['default'],
	flexbox2012: _hacksFlexspec20122['default']
};
module.exports = exports['default'];
},{"./hacks/cursor":5,"./hacks/flexbox":6,"./hacks/flexspec/2009":7,"./hacks/flexspec/2012":8,"./hacks/gradient":9,"./hacks/sizing":10}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = hack;
function condition(browserInfo) {
	return browserInfo.prefix.inline == 'Webkit' || browserInfo.prefix.inline == 'Moz' && browserInfo.version <= 23;
}

function hack(browserInfo) {
	if (condition(browserInfo)) {

		return {
			prefixValue: {
				cursor: ['zoom-in', 'zoom-out', 'grab', 'grabbing']
			}
		};
	} else {
		return false;
	}
}

module.exports = exports['default'];
},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = hack;
function condition(browserInfo) {
	return browserInfo.prefix.inline == 'Webkit';
}

function hack(browserInfo) {
	if (condition(browserInfo)) {

		return {
			prefixValue: {
				display: ['flex', 'inline-flex']
			}
		};
	} else {
		return false;
	}
}

module.exports = exports['default'];
},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = hack;
function condition(browserInfo) {
	return browserInfo.prefix.inline == 'Webkit' && browserInfo.android && browserInfo.version < 4.4;
}

function hack(browserInfo) {
	if (condition(browserInfo)) {

		return {
			prefixValue: {},
			alternativeProperty: {},
			alternativeValue: {}
		};
	} else {
		return false;
	}
}

module.exports = exports['default'];
},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = hack;
function condition(browserInfo) {
	return browserInfo.msie && browserInfo.version == 10;
}

function hack(browserInfo) {
	if (condition(browserInfo)) {

		var msValues = {
			'space-around': 'distribute',
			'space-between': 'justify',
			'flex-start': 'start',
			'flex-end': 'end'
		};

		return {
			alternativeProperty: {
				'justifyContent': 'msFlexPack',
				'alignItems': 'msFlexAlign',
				'alignContent': 'msFlexLinePack',
				'order': 'msFlexOrder',
				'alignSelf': 'msFlexItemAlign',
				'flexGrow': 'msFlexPositive',
				'flexShrink': 'msFlexNegative',
				'flexBasis': 'msPreferredSize'
			},
			alternativeValue: {
				justifyContent: msValues,
				alignContent: msValues,
				display: {
					'flex': browserInfo.prefix.CSS + 'flexbox',
					'inline-flex': browserInfo.prefix.CSS + 'inline-flexbox'
				}
			}
		};
	} else {
		return false;
	}
}

module.exports = exports['default'];
},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = hack;
function condition(browserInfo) {
	return browserInfo.browser == 'chrome' && browserInfo.version <= 25 || browserInfo.browser == 'firefox' && browserInfo.version <= 15 || browserInfo.browser == 'opera' && browserInfo.version == 11.5 || browserInfo.browser == 'safari' && browserInfo.version <= 6.1;
}

function hack(browserInfo) {
	if (condition(browserInfo)) {

		var gradients = ['linear-gradient', 'radial-gradient', 'repeating-linear-gradient', 'repeating-radial-gradient'];

		return {
			prefixValue: {
				background: gradients,
				backgroundImage: gradients
			},
			containValue: true
		};
	} else {
		return false;
	}
}

module.exports = exports['default'];
},{}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = hack;
function condition(browserInfo) {
	/**
  * This actually is only available with prefixes
  * NOTE: This might change in the feature
  */
	return true;
}

function hack(browserInfo) {
	if (condition(browserInfo)) {

		var sizingValues = ['min-content', 'max-content', 'fill-available', 'fit-content'];
		var containFloats = Array.apply(undefined, sizingValues);
		containFloats.push('contain-floats');

		return {
			prefixValue: {
				columnWidth: sizingValues,
				maxHeight: sizingValues,
				maxWidth: sizingValues,
				width: sizingValues,
				height: sizingValues,
				minWidth: containFloats,
				minHeight: containFloats
			}
		};
	} else {
		return false;
	}
}

module.exports = exports['default'];
},{}],11:[function(require,module,exports){
/*!
  * Bowser - a browser detector
  * https://github.com/ded/bowser
  * MIT License | (c) Dustin Diaz 2015
  */

!function (name, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else this[name] = definition()
}('bowser', function () {
  /**
    * See useragents.js for examples of navigator.userAgent
    */

  var t = true

  function detect(ua) {

    function getFirstMatch(regex) {
      var match = ua.match(regex);
      return (match && match.length > 1 && match[1]) || '';
    }

    function getSecondMatch(regex) {
      var match = ua.match(regex);
      return (match && match.length > 1 && match[2]) || '';
    }

    var iosdevice = getFirstMatch(/(ipod|iphone|ipad)/i).toLowerCase()
      , likeAndroid = /like android/i.test(ua)
      , android = !likeAndroid && /android/i.test(ua)
      , chromeBook = /CrOS/.test(ua)
      , edgeVersion = getFirstMatch(/edge\/(\d+(\.\d+)?)/i)
      , versionIdentifier = getFirstMatch(/version\/(\d+(\.\d+)?)/i)
      , tablet = /tablet/i.test(ua)
      , mobile = !tablet && /[^-]mobi/i.test(ua)
      , result

    if (/opera|opr/i.test(ua)) {
      result = {
        name: 'Opera'
      , opera: t
      , version: versionIdentifier || getFirstMatch(/(?:opera|opr)[\s\/](\d+(\.\d+)?)/i)
      }
    }
    else if (/yabrowser/i.test(ua)) {
      result = {
        name: 'Yandex Browser'
      , yandexbrowser: t
      , version: versionIdentifier || getFirstMatch(/(?:yabrowser)[\s\/](\d+(\.\d+)?)/i)
      }
    }
    else if (/windows phone/i.test(ua)) {
      result = {
        name: 'Windows Phone'
      , windowsphone: t
      }
      if (edgeVersion) {
        result.msedge = t
        result.version = edgeVersion
      }
      else {
        result.msie = t
        result.version = getFirstMatch(/iemobile\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/msie|trident/i.test(ua)) {
      result = {
        name: 'Internet Explorer'
      , msie: t
      , version: getFirstMatch(/(?:msie |rv:)(\d+(\.\d+)?)/i)
      }
    } else if (chromeBook) {
      result = {
        name: 'Chrome'
      , chromeBook: t
      , chrome: t
      , version: getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i)
      }
    } else if (/chrome.+? edge/i.test(ua)) {
      result = {
        name: 'Microsoft Edge'
      , msedge: t
      , version: edgeVersion
      }
    }
    else if (/chrome|crios|crmo/i.test(ua)) {
      result = {
        name: 'Chrome'
      , chrome: t
      , version: getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i)
      }
    }
    else if (iosdevice) {
      result = {
        name : iosdevice == 'iphone' ? 'iPhone' : iosdevice == 'ipad' ? 'iPad' : 'iPod'
      }
      // WTF: version is not part of user agent in web apps
      if (versionIdentifier) {
        result.version = versionIdentifier
      }
    }
    else if (/sailfish/i.test(ua)) {
      result = {
        name: 'Sailfish'
      , sailfish: t
      , version: getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/seamonkey\//i.test(ua)) {
      result = {
        name: 'SeaMonkey'
      , seamonkey: t
      , version: getFirstMatch(/seamonkey\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/firefox|iceweasel/i.test(ua)) {
      result = {
        name: 'Firefox'
      , firefox: t
      , version: getFirstMatch(/(?:firefox|iceweasel)[ \/](\d+(\.\d+)?)/i)
      }
      if (/\((mobile|tablet);[^\)]*rv:[\d\.]+\)/i.test(ua)) {
        result.firefoxos = t
      }
    }
    else if (/silk/i.test(ua)) {
      result =  {
        name: 'Amazon Silk'
      , silk: t
      , version : getFirstMatch(/silk\/(\d+(\.\d+)?)/i)
      }
    }
    else if (android) {
      result = {
        name: 'Android'
      , version: versionIdentifier
      }
    }
    else if (/phantom/i.test(ua)) {
      result = {
        name: 'PhantomJS'
      , phantom: t
      , version: getFirstMatch(/phantomjs\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/blackberry|\bbb\d+/i.test(ua) || /rim\stablet/i.test(ua)) {
      result = {
        name: 'BlackBerry'
      , blackberry: t
      , version: versionIdentifier || getFirstMatch(/blackberry[\d]+\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/(web|hpw)os/i.test(ua)) {
      result = {
        name: 'WebOS'
      , webos: t
      , version: versionIdentifier || getFirstMatch(/w(?:eb)?osbrowser\/(\d+(\.\d+)?)/i)
      };
      /touchpad\//i.test(ua) && (result.touchpad = t)
    }
    else if (/bada/i.test(ua)) {
      result = {
        name: 'Bada'
      , bada: t
      , version: getFirstMatch(/dolfin\/(\d+(\.\d+)?)/i)
      };
    }
    else if (/tizen/i.test(ua)) {
      result = {
        name: 'Tizen'
      , tizen: t
      , version: getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.\d+)?)/i) || versionIdentifier
      };
    }
    else if (/safari/i.test(ua)) {
      result = {
        name: 'Safari'
      , safari: t
      , version: versionIdentifier
      }
    }
    else {
      result = {
        name: getFirstMatch(/^(.*)\/(.*) /),
        version: getSecondMatch(/^(.*)\/(.*) /)
     };
   }

    // set webkit or gecko flag for browsers based on these engines
    if (!result.msedge && /(apple)?webkit/i.test(ua)) {
      result.name = result.name || "Webkit"
      result.webkit = t
      if (!result.version && versionIdentifier) {
        result.version = versionIdentifier
      }
    } else if (!result.opera && /gecko\//i.test(ua)) {
      result.name = result.name || "Gecko"
      result.gecko = t
      result.version = result.version || getFirstMatch(/gecko\/(\d+(\.\d+)?)/i)
    }

    // set OS flags for platforms that have multiple browsers
    if (!result.msedge && (android || result.silk)) {
      result.android = t
    } else if (iosdevice) {
      result[iosdevice] = t
      result.ios = t
    }

    // OS version extraction
    var osVersion = '';
    if (result.windowsphone) {
      osVersion = getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i);
    } else if (iosdevice) {
      osVersion = getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i);
      osVersion = osVersion.replace(/[_\s]/g, '.');
    } else if (android) {
      osVersion = getFirstMatch(/android[ \/-](\d+(\.\d+)*)/i);
    } else if (result.webos) {
      osVersion = getFirstMatch(/(?:web|hpw)os\/(\d+(\.\d+)*)/i);
    } else if (result.blackberry) {
      osVersion = getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i);
    } else if (result.bada) {
      osVersion = getFirstMatch(/bada\/(\d+(\.\d+)*)/i);
    } else if (result.tizen) {
      osVersion = getFirstMatch(/tizen[\/\s](\d+(\.\d+)*)/i);
    }
    if (osVersion) {
      result.osversion = osVersion;
    }

    // device type extraction
    var osMajorVersion = osVersion.split('.')[0];
    if (tablet || iosdevice == 'ipad' || (android && (osMajorVersion == 3 || (osMajorVersion == 4 && !mobile))) || result.silk) {
      result.tablet = t
    } else if (mobile || iosdevice == 'iphone' || iosdevice == 'ipod' || android || result.blackberry || result.webos || result.bada) {
      result.mobile = t
    }

    // Graded Browser Support
    // http://developer.yahoo.com/yui/articles/gbs
    if (result.msedge ||
        (result.msie && result.version >= 10) ||
        (result.yandexbrowser && result.version >= 15) ||
        (result.chrome && result.version >= 20) ||
        (result.firefox && result.version >= 20.0) ||
        (result.safari && result.version >= 6) ||
        (result.opera && result.version >= 10.0) ||
        (result.ios && result.osversion && result.osversion.split(".")[0] >= 6) ||
        (result.blackberry && result.version >= 10.1)
        ) {
      result.a = t;
    }
    else if ((result.msie && result.version < 10) ||
        (result.chrome && result.version < 20) ||
        (result.firefox && result.version < 20.0) ||
        (result.safari && result.version < 6) ||
        (result.opera && result.version < 10.0) ||
        (result.ios && result.osversion && result.osversion.split(".")[0] < 6)
        ) {
      result.c = t
    } else result.x = t

    return result
  }

  var bowser = detect(typeof navigator !== 'undefined' ? navigator.userAgent : '')

  bowser.test = function (browserList) {
    for (var i = 0; i < browserList.length; ++i) {
      var browserItem = browserList[i];
      if (typeof browserItem=== 'string') {
        if (browserItem in bowser) {
          return true;
        }
      }
    }
    return false;
  }

  /*
   * Set our detect method to the main bowser object so we can
   * reuse it to test other user agents.
   * This is needed to implement future tests.
   */
  bowser._detect = detect;

  return bowser
});

},{}]},{},[1]);
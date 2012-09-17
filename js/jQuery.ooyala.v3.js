/*!
 * jQuery Ooyala v3 Plugin
 * 
 * version: 1.0.0 (12-September-2012)
 * @requires v1.3.2 or later
 *
 *
 * Author: Cameron Dumas
 * 
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html 
 */
 
/*
TODO: 

	get removing events to work
	ad support
*/

(function ($) {
    var OOYALA = ".ooyala",
        OOYALA_PLAYER_CLASS = "jquery-ooyala-player",
        OPTS = "opts" + OOYALA;
    var Ooyala = {};
    Ooyala.OoyalaPlayers = {};

    Ooyala.inits = [];

    Ooyala.inited = false;

    $.ooyala = {};

    var defaults = {
        /*query string parameters*/
        height: 355,
        width: 425,
        embedCode: "hpbnExMjqlog8G5Zdzkee4DwyAd1Ymba",
		locale: 'English',
		//http://player.ooyala.com/v3/...  player scripts
		player: 'e533a5df695a4301b8ae48d8cb1d235f',
		platform: 'flash', //flash-only | flash | html5-fallback | html5-priority
		namespace: null,
		chromeless: false,
		autoPlay: false,
		//extra setup
		cssFile: '',
		cssClass: '',
        position: 'relative',
		//ad params
		adParams: {}, //ex. { 'vast': { tagUrl: '...', ... } }
		adSetCode: null,
		
        /*private variables*/
        playerID: "ooyalaPlayerContainer",

        /*player events*/
		events: {},
		intercepts: {}
    };

    $.fn.ooyala = function (input, xtra) {
        var $this = $(this);

        var type = typeof input;

        if (arguments.length === 0 || type === "object") {
            return $this.each(function () {
                Ooyala.init($(this), input);
            });
        }
        else if (type === "string") {
            //PLAYER[input]();
            return $this.triggerHandler(input + OOYALA, xtra || null);
        }
    };
	
	var getNamespace = function(options) {
		if(options.namespace) {
			return eval(p.opts.namespace);
		} else {
			return window.OO;
		}
	};
	
    var buildFN = function (fn) {
        return function (evt, param) {
            var p = Ooyala.getPkg(evt);
            if (p.ooyalaplayer) {

                var ret = fn(evt, param, p);

                if (typeof (ret) == "undefined") {
                    ret = p.$player;
                }

                return ret;
            }
            return p.$player;
        };
    };

    $.ooyala.getPlayers = function () {
        return Ooyala.OoyalaPlayers;
    };

    Ooyala.init = function ($player, opts) {
        if ($player.hasClass(OOYALA_PLAYER_CLASS)) {
            return $player;
        }
        var options = $.extend({}, defaults, opts);

        options.playerID = options.playerID + (Math.floor(new Date().valueOf() * Math.random()));
		
		$player.addClass(OOYALA_PLAYER_CLASS).data(OPTS, options);
		
        for (e in PLAYER) {
            $player.bind(e + OOYALA, $player, PLAYER[e]);
        }

        jQuery("<div></div>").attr({ "id": options.playerID, "class": options.cssClass }).css({
            height: options.height,
            width: options.width,
            position: options.position
        }).appendTo($player);

        Ooyala.initPlayer($player, options);

        return $player;
    };

    Ooyala.initPlayer = function ($player, o) {
        //TODO: VISIT
		
		var playerScript = document.createElement("script"),
			url = "http://player.ooyala.com/v3/" + o.player + "?";
        url += 'platform=' + o.platform;
		url += "&chromeless=" + o.chromeless;
		url += "&autoplay=" + (o.autoPlay ? 1 : 0);
		if(o.namespace) {
			url += '&namespace=' + o.namespace;
		}
		//playerScript.type = "text/javascript";
        //playerScript.src = url;
        //jQuery('head').append(playerScript);
		jQuery.ajax({
			url: url,
			cache: true,
			dataType: 'script',
			success: function() {
				var OOYALA_OBJ = getNamespace(o); 
				Ooyala.OoyalaPlayers[o.playerID] = OOYALA_OBJ.Player.create(o.playerID, o.embedCode, {
					width: o.width,
					height: o.height,
					css: o.cssFile,
					autoplay: o.autoPlay,
					onCreate: function (player) {
						var fn;
						for(fn in o.events) {
							player.mb.subscribe(OOYALA_OBJ.EVENTS[fn], o.playerID, (typeof o.events[fn] === 'function') ? o.events[fn] : function() {});
						}
						for(fn in o.intercepts) {
							player.mb.intercept(OOYALA_OBJ.EVENTS[fn], o.playerID, (typeof o.intercepts[fn] === 'function') ? o.intercepts[fn] : function() {});
						}
						
					}
				});
			}
		});
    };

    Ooyala.getPkg = function (evt) {
        var $player = evt.data,
            opts = $player.data(OPTS),
            ooyalaplayer = Ooyala.OoyalaPlayers[opts.playerID];
        return {
            $player: $player,
            opts: opts,
            ooyalaplayer: ooyalaplayer
        };
    };

    var PLAYER = {
        /*standard events*/
        play: buildFN(function (evt, param, p) {
            if (typeof (param) === "object") {
				p.ooyalaplayer.setEmbedCode(param.embedCode, param);
            } else if (param) {
				p.ooyalaplayer.setEmbedCode(param);
            } else {
                p.ooyalaplayer.play();
				return;
            }
        }),

        pause: buildFN(function (evt, param, p) {
            p.ooyalaplayer.pause();
        }),

        stop: buildFN(function (evt, param, p) {
            p.ooyalaplayer.setPlayheadTime(0);
            p.ooyalaplayer.pause();
        }),

        seek: buildFN(function (evt, param, p) {
            if (typeof (param) === "number") {
                p.ooyalaplayer.setPlayheadTime(param);
            }
        }),

        fastforward: buildFN(function (evt, param, p) {
            if (typeof (param) === "number") {
                p.ooyalaplayer.setPlayheadTime(p.ooyalaplayer.getPlayheadTime() + param);
            }
        }),

        rewind: buildFN(function (evt, param, p) {
            if (typeof (param) === "number") {
                p.ooyalaplayer.setPlayheadTime(p.ooyalaplayer.getPlayheadTime() - param);
            }
        }),

        volume: buildFN(function (evt, param, p) {
            if (param) {
                if (param > 1 && param !== 0) { param = param / 100; }
                p.ooyalaplayer.setVolume(param);
            } else {
                return p.ooyalaplayer.getVolume();
            }
        }),

        embedCode: buildFN(function (evt, param, p) {
            if(typeof (param) === "string") {
				p.ooyalaplayer.setEmbedCode(param);
			} else {	
				return p.ooyalaplayer.getEmbedCode();
			}
        }),

        data: buildFN(function (evt, param, p) {
            var ret = {};
            var P = p.ooyalaplayer;
            $.extend(ret, P.getItem()); //embedCode, title, description, time, lineup, promo, hostedAtURL,
            ret.playheadTime = P.getPlayheadTime();
			ret.state = P.getState();
			ret.volume = P.getVolume();
			ret.fullscreen = P.isFullscreen();
			ret.liveTime = P.getLiveTime();
			ret.error = {
				code: P.getError(),
				text: P.getErrorText()
			};
			ret.bufferLength = P.getBufferLength();
            return ret;
        }),

        player: buildFN(function (evt, param, p) {
            return p.ooyalaplayer;
        }),
		
		closedCaptions: buildFN(function (evt, param, p) {
			if(typeof (param) === "string") {
				p.ooyalaplayer.setClosedCaptionsLanguage(param);
			} else {	
				return p.ooyalaplayer.getCurrentItemClosedCaptionsLanguages();
			}
		}),
		
		timedText: buildFN(function (evt, param, p) {
			if(typeof(param) === 'object') {
				return p.ooyalaplayer.getTimedText(param.start, param.end);
			}
		}),
		
		event: buildFN(function(evt, param, p) {
			//removing events is not working
			var OOYALA_OBJ = getNamespace(p.opts);
			if(typeof (param) === 'object') {
				p.ooyalaplayer.mb.subscribe(OOYALA_OBJ.EVENTS[param.event], p.opts.playerID, (typeof param.fn === 'function') ? param.fn : function() {});
			} else if (typeof (param) === 'string') {
				p.ooyalaplayer.mb.unsubscribe(OOYALA_OBJ.EVENTS[param]);
			}
		}),
		
        destroy: buildFN(function (evt, param, p) {
            //on the destroy we only want to remove the actual video player and not other elements within the parent selector
			//p.ooyalaplayer.destroy();
			p.ooyalaplayer.destroy();
            p.$player.removeClass(OOYALA_PLAYER_CLASS)
                    .data(OPTS, null)
                    .unbind(OOYALA)
                    .find('#' + p.opts.playerID).remove();
            delete Ooyala.OoyalaPlayers[p.opts.playerID];

            return null;
        })
    };

} (jQuery));

/*!
 * jQuery Ooyala Plugin
 * 
 * version: 1.0.0 (07-March-2012)
 * @requires v1.3.2 or later
 *
 * @imports OoyalaPlayer - http://www.ooyala.com/player.js
 *
 * Author: Cameron Dumas
 * 
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html 
 */
 
/*
TODO: 

	expand getRatings to return object with averages and other info
	
	skipping ads not working
	
	look into using video tag callbacks for things such as buffered
	
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

    $.ooyala.defaults = {
        afterReady: function ($player) { },
        stateChange: function (player, state, errorCode, errorText) {
            var _ret = this.onPlayer;
            switch (state) {
                case "playing": return _ret.playing[player]();
                case "paused": return _ret.paused[player]();
                case "buffering": return _ret.buffering[player]();
                case "error": return _ret.error[player](errorCode, errorText);
                default: return null;
            };
        },
        seek: function (player, newPlayheadTime, oldPlayheadTime) {
            var _ret = this.onPlayer;
            _ret.seek[player](newPlayheadTime, oldPlayheadTime);
        },
        onPlayer: {
            ready: {},
            playing: {},
            paused: {},
            buffering: {},
            seek: {},
            error: {}
        }
    };

    var defaults = {
        /*query string parameters*/
        height: 355,
        width: 425,
        embedCode: "hpbnExMjqlog8G5Zdzkee4DwyAd1Ymba",
        playhead: 0,
        autoPlay: false,
        view: "normal", //'normal' or 'channel'
        loop: false,
        chromeless: false,
        alwaysShowScrubber: false,
        browserPlacement: null, //'left', 'right', 'left40', 'left40px'
        hide: null, //['all', 'volume', 'fullscreen', 'channels', 'sharing', 'info', 'embed', 'endscreen']
        transition: 'play', //'play' or 'selector'
        wmode: 'opaque',
        cssClass: '',
        position: 'relative',
		thruParams: {},
        /*have the video ready for ratings*/
        loadRatingsApi: false,

        /*private variables*/
        playerID: "ooyalaPlayerContainer",

        /*player events*/
        onPlay: function () { },
        onPause: function () { },
        onStop: function () { },
        onBuffering: function () { },
        onSeek: function (newPlayheadTime, oldPlayheadTime) { },
        onError: function (errorCode, errorText) { },

        onActivePanelChanged: function (activePanel) { }, //activePanel is 'null', 'more', 'syndication', 'embed', 'info', 'channels'
        onAdStarted: function (cancelable, format, source, type) { },
        onAdCompleted: function (cancelable, format, source, type) { },
        onAdClicked: function (cancelable, format, source, type) { },
        onApiReady: function () { },
		onClosedCaptionsTextReady: function ( bubbles, cancelable, currentTarget, embedCode, eventPhase, target, type){},
        onCompanionAdsReady: function (cancelable, type, companionAds) { },
        onCurrentItemEmbedCodeChanged: function (description, embedCode, hostedAtURL, lineup, promo, time, title) { },
        onEmbedCodeChanged: function (description, embedCode, hostedAtURL, lineup, promo, time, title) { },
        onFullscreenChanged: function (state) { }, //state is 'normal' or 'fullScreen'
        onLoadComplete: function () { },
        onMetadataReady: function (metadata) { },
        onPlayComplete: function () { },
        onPlayerEmbedded: function () { },
		onPlayerLoading: function () { },
        onPlayheadTimeChanged: function (playheadTime) { },
        onRatingsApiReady: function () { },
        onRelatedMediaReady: function (relatedMedia) { },
        onStartContentDownload: function () { },
        onTargetBitrateQualityChanged: function (targetBitrateQuality) { },
        onTargetBitrateChanged: function (targetBitrate) { },
        onTotaltimeChanged: function (totalTime) { },
        onVolumeChanged: function (volume) { }

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

    Ooyala.OOYALA_Events = {
        "activePanelChanged": {},
        "adStarted": {},
        "adCompleted": {},
        "adClicked": {},
        "apiReady": {},
		"closedCaptionsTextReady": {},
        "companionAdsReady": {},
        "currentItemEmbedCodeChanged": {},
        "embedCodeChanged": {},
        "fullscreenChanged": {},
        "loadComplete": {},
        "metadataReady": {},
        "playComplete": {},
        "playerEmbedded": {},
		"playerLoading": {},
        "playheadTimeChanged": {},
        "ratingsApiReady": {},
        "relatedMediaReady": {},
        "seeked": {},
        "startContentDownload": {},
        "stateChanged": {},
        "totalTimeChanged": {},
        "targetBitrateQualityChanged": {},
        "targetBitrateChanged": {},
        "volumeChanged": {}
    };

    $.ooyala.execute = function (playerId, eventName, eventParams) {
        var method;
        switch (eventName) {
            case "activePanelChanged":
                method = Ooyala.OOYALA_Events.activePanelChanged[playerId];
                if (typeof method === "function") { method(eventParams.activePanel); }
                break;
            case "adStarted":
                method = Ooyala.OOYALA_Events.adStarted[playerId];
                if (typeof method === "function") { method(eventParams.cancelable, eventParams.format, eventParams.source, eventParams.type); }
                break;
            case "adCompleted":
                method = Ooyala.OOYALA_Events.adCompleted[playerId];
                if (typeof method === "function") { method(eventParams.cancelable, eventParams.format, eventParams.source, eventParams.type); }
                break;
            case "adClicked":
                method = Ooyala.OOYALA_Events.adClicked[playerId];
                if (typeof method === "function") { method(eventParams.cancelable, eventParams.format, eventParams.source, eventParams.type); }
                break;
            case "apiReady":
                $.ooyala.defaults.onPlayer.ready[playerId]();
                $.ooyala.defaults.afterReady(document.getElementById(playerId));
                method = Ooyala.OOYALA_Events.apiReady[playerId];
                if (typeof method === "function") { method(); }
                break;
			case "closedCaptionsTextReady":
				method = Ooyala.OOYALA_Events.closedCaptionsTextReady[playerId];
				if(typeof method === "function") {method(eventParams.bubbles, eventParams.cancelable, eventParams.currentTarget, eventParams.embedCode, eventParams.eventPhase, eventParams.target, eventParams.type); }
            case "companionAdsReady":
                method = Ooyala.OOYALA_Events.companionAdsReady[playerId];
                if (typeof method === "function") { method(eventParams.cancelable, eventParams.type, eventParams.companionAds); }
                break;
            case "currentItemEmbedCodeChanged":
                method = Ooyala.OOYALA_Events.currentItemEmbedCodeChanged[playerId];
                if (typeof method === "function") { method(eventParams.description, eventParams.embedCode, eventParams.hostedAtURL, eventParams.lineup, eventParams.promo, eventParams.time, eventParams.title); }
                break;
            case "embedCodeChanged":
                method = Ooyala.OOYALA_Events.embedCodeChanged[playerId];
                if (typeof method === "function") { method(eventParams.description, eventParams.embedCode, eventParams.hostedAtURL, eventParams.lineup, eventParams.promo, eventParams.time, eventParams.title); }
                break;
            case "fullscreenChanged":
                method = Ooyala.OOYALA_Events.fullscreenChanged[playerId];
                if (typeof method === "function") { method(eventParams.state); }
                break;
            case "loadComplete":
                method = Ooyala.OOYALA_Events.loadComplete[playerId];
                if (typeof method === "function") { method(); }
                break;
            case "metadataReady":
                method = Ooyala.OOYALA_Events.metadataReady[playerId];
                if (typeof method === "function") { method(eventParams.metadata); }
                break;
            case "playComplete":
                method = Ooyala.OOYALA_Events.playComplete[playerId];
                if (typeof method === "function") { method(); }
                break;
            case "playerEmbedded":
                method = Ooyala.OOYALA_Events.playerEmbedded[playerId];
                if (typeof method === "function") { method(); }
                break;
			case "playerLoading":
				method = Ooyala.OOYALA_Events.playerLoading[playerId];
				if(typeof method === "function") { method(); }
				break;
            case "playheadTimeChanged":
                method = Ooyala.OOYALA_Events.playheadTimeChanged[playerId];
                if (typeof method === "function") { method(eventParams.playheadTime); }
                break;
            case "ratingsApiReady":
                method = Ooyala.OOYALA_Events.ratingsApiReady[playerId];
                if (typeof method === "function") { method(); }
                break;
            case "relatedMediaReady":
                method = Ooyala.OOYALA_Events.relatedMediaReady[playerId];
                if (typeof method === "function") { method(eventParams.relatedMedia); }
                break;
            case "seeked":
                $.ooyala.defaults.seek(playerId, eventParams.newPlayheadTime, eventParams.oldPlayheadTime);
                break;
            case "startContentDownload":
                method = Ooyala.OOYALA_Events.startContentDownload[playerId];
                if (typeof method === "function") { method(); }
                break;
            case "stateChanged":
                $.ooyala.defaults.stateChange(playerId, eventParams.state, eventParams.errorCode, eventParams.errorText);
                break;
            case "totalTimeChanged":
                method = Ooyala.OOYALA_Events.totalTimeChanged[playerId];
                if (typeof method === "function") { method(eventParams.totalTime); }
                break;
            case "targetBitrateQualityChanged":
                method = Ooyala.OOYALA_Events.targetBitrateQualityChanged[playerId];
                if (typeof method === "function") { method(eventParams.targetBitrateQuality); }
                break;
            case "targetBitrateChanged":
                method = Ooyala.OOYALA_Events.targetBitrateChanged[playerId];
                if (typeof method === "function") { method(eventParams.targetBitrate); }
                break;
            case "volumeChanged":
                method = Ooyala.OOYALA_Events.volumeChanged[playerId];
                if (typeof method === "function") { method(eventParams.volume); }
                break;
        }
    };
	
	$.ooyala.thrueParams = {
		"Adap.tv": "thruParam_thruParam_adapTv-ads-manager",
		"Adify": "thruParam_adify",
		"AdTech": "thruParam_adtech",
		"Atlas": "thruParam_atlas",
		"Brightroll": "thruParam_brightroll",
		"Brightroll.Overlay": "thruParam_brightrollOverlay",
		"CBS.Interactive": "thruParam_cbsi",
		"DART.Enterprise": "thruParam_dartEnterprise",
		"DART.Enterprise.Overlay": "thruParam_dartEnterpriseOverlay",
		"DoubleClick": "thruParam_doubleclick",
		"FreeWheel": "thruParam_freewheel",
		"Google.AdSense": "thruParam_google",
		"Lightningcast": "thruParam_lightningcast",
		"LiveRail.VAST": "thruParam_liverail",
		"LiveRail": "thruParam_liverail-ads-manager",
		"Ooyala.Video.Ad": "thruParam_videoad",
		"OpenX": "thruParam_openx",
		"Open.AdStream.24.7": "thruParam_as247",
		"Tremor.Media": "thruParam_tremor-ads-manager",
		"TV2N": "thruParam_tv2n",
		"VAST": "thruParam_vast",
		"VAST.Overlay": "thruParam_vastOverlay",
		"YuMe": "thruParam_yume"
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

        Ooyala.initDefaults($.ooyala.defaults, options);

        jQuery("<div></div>").attr({ "id": options.playerID + "_c", "class": options.cssClass }).css({
            height: options.height,
            width: options.width,
            position: options.position
        }).appendTo($player);

        Ooyala.initPlayer($player, options);

        return $player;
    };

    Ooyala.initDefaults = function (d, o) {

        var ID = o.playerID;

        // default onPlayer events
        var dp = d.onPlayer;
        dp.ready[ID] = function () {
            var ooyalaplayer;
            if (o.loadRatingsApi) {
                Ooyala.OoyalaPlayers[o.playerID].loadRatingsApi();
            }
            if (o.playhead > 0) {
                ooyalaplayer = $("object", Ooyala.OoyalaPlayers[o.playerID]).get(0) || $("video", Ooyala.OoyalaPlayers[o.playerID]).parent().get(0);
                ooyalaplayer.setPlayheadTime(o.playhead)
            }
        };
        dp.playing[ID] = o.onPlay;
        dp.paused[ID] = o.onPause;
        dp.buffering[ID] = o.onBuffering;
        dp.error[ID] = o.onError;
        dp.seek[ID] = o.onSeek;

        Ooyala.OOYALA_Events.activePanelChanged[ID] = o.onActivePanelChanged;
        Ooyala.OOYALA_Events.adStarted[ID] = o.onAdStarted;
        Ooyala.OOYALA_Events.adCompleted[ID] = o.onAdCompleted;
        Ooyala.OOYALA_Events.adClicked[ID] = o.onAdClicked;
        Ooyala.OOYALA_Events.apiReady[ID] = function () {
            Ooyala.OoyalaPlayers[o.playerID] = document.getElementById(o.playerID);
            if (typeof o.onApiReady === 'function') {
                o.onApiReady();
            }
        };
		Ooyala.OOYALA_Events.closedCaptionsTextReady[ID] = o.onClosedCaptionsTextReady;
        Ooyala.OOYALA_Events.companionAdsReady[ID] = o.onCompanionAdsReady;
        Ooyala.OOYALA_Events.currentItemEmbedCodeChanged[ID] = o.onCurrentItemEmbedCodeChanged;
        Ooyala.OOYALA_Events.embedCodeChanged[ID] = o.onEmbedCodeChanged;
        Ooyala.OOYALA_Events.fullscreenChanged[ID] = o.onFullscreenChanged;
        Ooyala.OOYALA_Events.loadComplete[ID] = o.onLoadComplete;
        Ooyala.OOYALA_Events.metadataReady[ID] = o.onMetadataReady;
        Ooyala.OOYALA_Events.playComplete[ID] = o.onPlayComplete;
		Ooyala.OOYALA_Events.playerLoading[ID] = o.onPlayerLoading;
        Ooyala.OOYALA_Events.playheadTimeChanged[ID] = o.onPlayheadTimeChanged;
        Ooyala.OOYALA_Events.ratingsApiReady[ID] = o.onRatingsApiReady;
        Ooyala.OOYALA_Events.relatedMediaReady[ID] = o.onRelatedMediaReady;
        Ooyala.OOYALA_Events.startContentDownload[ID] = o.onStartContentDownload;
        Ooyala.OOYALA_Events.seeked[ID] = o.onSeek;
        Ooyala.OOYALA_Events.targetBitrateQualityChanged[ID] = o.onTargetBitrateQualityChanged;
        Ooyala.OOYALA_Events.targetBitrateChanged[ID] = o.onTargetBitrateChanged;
        Ooyala.OOYALA_Events.totalTimeChanged[ID] = o.onTotaltimeChanged;
        Ooyala.OOYALA_Events.volumeChanged[ID] = o.onVolumeChanged;
    };
    Ooyala.initPlayer = function ($player, o) {
        var callback = 'function ' + o.playerID + '_callback(player, eventName, eventParams){$.ooyala.execute(player, eventName, eventParams);}',
			playerScript = document.createElement("script"),
			url = "http://www.ooyala.com/player.js?",
			param;
        url += "callback=" + o.playerID + '_callback';
        url += "&playerId=" + o.playerID;
        url += "&width=" + o.width;
        url += "&height=" + o.height;
        url += "&embedCode=" + o.embedCode;
        url += "&playerContainerId=" + o.playerID + "_c";
        url += "&wmode=" + o.wmode;
        url += "&view=" + o.view;
        url += "&hide=" + o.hide;
        url += "&videoPcode=Iyamk6YZTw8DxrC60h0fQipg3BfO";
        if (o.browserPlacement)
            url += "&browserPlacement=" + o.browserPlacement;
        if (o.chromeless)
            url += "&layout=chromeless";
        url += "&alwaysShowScrubber=" + o.alwaysShowScrubber;
        url += "&transition=" + o.transition;
        url += "&loop=" + (o.loop ? 1 : 0);
        url += "&autoplay=" + (o.autoPlay ? 1 : 0);

        //not working
        url += "&loadStartTime=" + o.playhead;
		
		for(param in o.thruParams) {
			url += "&thruParam_" + param + "=" + o.thruParams[param];
		}
		
        jQuery($player).append('<script type="text/javascript"' + '>' + callback + '</script' + '>');

        playerScript.type = "text/javascript";
        playerScript.src = url;
        jQuery($player).append(playerScript);

        Ooyala.OoyalaPlayers[o.playerID] = document.getElementById(o.playerID);
    };

    Ooyala.getPkg = function (evt) {
        var $player = evt.data,
            opts = $player.data(OPTS),
            ooyalaplayer = $("object#" + opts.playerID).get(0),
			html5 = false;
        if (!ooyalaplayer) {
            ooyalaplayer = $("video", Ooyala.OoyalaPlayers[opts.playerID]).parent().get(0);
            if (ooyalaplayer) {
                html5 = true;
            }
        }
        return {
            $player: $player,
            opts: opts,
            ooyalaplayer: ooyalaplayer,
            isHtml5: html5
        };
    };

    var PLAYER = {
        /*standard events*/
        play: buildFN(function (evt, param, p) {
            if (typeof (param) === "object") {
                if (!p.isHtml5) {
                    p.ooyalaplayer.setQueryStringParameters({
                        embedCode: param.embedCode,
                        ootime: param.time
                    });
                } else {
                    p.ooyalaplayer.setEmbedCode(param.embedCode);
                    p.ooyalaplayer.setPlayheadTime(param.time);
                }
            } else if (param) {
                if (!p.isHtml5) {
                    p.ooyalaplayer.setQueryStringParameters({
                        embedCode: param
                    });
                } else {
                    p.ooyalaplayer.setEmbedCode(param);
                }
            } else {
                p.ooyalaplayer.playMovie();
            }
            p.opts.onPlay(param);
        }),

        pause: buildFN(function (evt, param, p) {
            p.ooyalaplayer.pauseMovie();
            p.opts.onPause();
        }),

        stop: buildFN(function (evt, param, p) {
            p.ooyalaplayer.setPlayheadTime(0);
            p.ooyalaplayer.pauseMovie();
            p.opts.onStop();
        }),

        seek: buildFN(function (evt, param, p) {
            if (typeof (param) === "number") {
                p.ooyalaplayer.setPlayheadTime(param);
                p.opts.onSeek(param);
            }
        }),

        fastforward: buildFN(function (evt, param, p) {
            if (typeof (param) === "number") {
                p.ooyalaplayer.setPlayheadTime(p.ooyalaplayer.getPlayheadTime() + param);
                p.opts.onSeek(param);
            }
        }),

        rewind: buildFN(function (evt, param, p) {
            if (typeof (param) === "number") {
                p.ooyalaplayer.setPlayheadTime(p.ooyalaplayer.getPlayheadTime() - param);
                p.opts.onSeek(param);
            }
        }),

        volume: buildFN(function (evt, param, p) {
            if (param) {
                if (param > 1) param = param / 100;
                p.ooyalaplayer.setVolume(param);
            } else {
                return p.ooyalaplayer.getVolume();
            }
        }),

        quality: buildFN(function (evt, param, p) {
            if (typeof (param) === "string") {
                //options are 'auto', 'low', 'medium', 'high'
                p.ooyalaplayer.setTargetBitrateQuality(param);
            } else if (typeof (param) === "number") {
                //this number is in kpbs ex: 1000 kpbs
                p.ooyalaplayer.setTargetBitrate(param);
            } else {
                return {
                    targetBitrateQuality: p.ooyalaplayer.getTargetBitrateQuality(),
                    targetBitrate: p.ooyalaplayer.getTargetBitrate()
                }
            }
        }),

        embedCode: buildFN(function (evt, param, p) {
            return p.ooyalaplayer.getEmbedCode();
        }),

        data: buildFN(function (evt, param, p) {
            var ret = {
            };
            var P = p.ooyalaplayer;
            $.extend(ret, P.getCurrentItem()); //embedCode, title, description, time, lineup, promo, hostedAtURL,
            try {
                ret.error = {
                    code: P.getErrorCode(),
                    text: P.getErrorText()
                }
            } catch (e) { }
            try {
                ret.fullscreen = P.getFullscreen();
            } catch (e) { }
            try {
                ret.item = P.getItem();
            } catch (e) { }
            try {
                ret.volume = P.getVolume();
            } catch (e) { }
            try {
                ret.playhead = P.getPlayheadTime();
            } catch (e) { }
            try {
                ret.state = P.getState();
            } catch (e) { }
            try {
                ret.availableBitRatesQualities = P.getBitrateQualitiesAvailable();
            } catch (e) { }
            try {
                ret.availableBitRates = P.getBitratesAvailable();
            } catch (e) { }
            try {
                ret.targetBitRateQuality = P.getTargetBitrateQuality();
            } catch (e) { }
            try {
                ret.targetBitRate = P.getTargetBitrate();
            } catch (e) { }
            try {
                ret.bufferSize = P.getBufferLength();
            } catch (e) { }

            return ret;
        }),

        player: buildFN(function (evt, param, p) {
            return p.ooyalaplayer;
        }),

        destroy: buildFN(function (evt, param, p) {
            //on the destroy we only want to remove the actual video player and not other elements within the parent selector
			//p.ooyalaplayer.destroy();
            p.$player.removeClass(OOYALA_PLAYER_CLASS)
                    .data(OPTS, null)
                    .unbind(OOYALA)
                    .find('#' + p.opts.playerID + '_c').remove();
            delete Ooyala.OoyalaPlayers[p.opts.playerID];

            return null;
        }),

        skipAd: buildFN(function (evt, param, p) {
            //TODO: not working
            p.ooyalaplayer.skipAd()
        }),

        /*EVENT TRIGGERS*/
        related: buildFN(function (evt, param, p) {
            //sends request to get the related media, then will call the onRelatedMediaReady event with the results
            var P = p.ooyalaplayer;
            if (typeof (param) === "object") {
                P.fetchRelatedMedia(P.getEmbedCode(), param);
            } else {
                P.fetchRelatedMedia(P.getEmbedCode(), {});
            }
        }),

        metadata: buildFN(function (evt, param, p) {
            //sends request to get the metadata, then calls the onMetadataReady event
            p.ooyalaplayer.fetchMetadata(p.ooyalaplayer.getEmbedCode());
        }),

        changeChannelVideo: buildFN(function (evt, param, p) {
            if (typeof (param) === "String") {
                return p.ooyalaplayer.changeCurrentItem(param);
            }
        }),

		//add a rating to the player
        rate: buildFN(function (evt, param, p) {
			if (p.opts.loadRatingsApi && p.ooyalaplayer.getCanRateCurrentItem() && typeof (param) === "number" && param >= 0 && param <= 10) {
                return p.ooyalaplayer.incrementCurrentItemRating(param);
            } else if (!p.opts.loadRatingsApi) {
                throw "Ratings API not Loaded";
            } else if (typeof (param) !== "number" || param < 0 || param > 10) {
                throw "Invalid rating";
            } else if (p.opts.loadRatingsApi && !p.ooyalaplayer.getCanRateCurrentItem()) {
                throw "User has already rated the video";
            }
        }),
		getRatings: buildFN(function(evt, param, p) {
			return (function() {
				var obj = {}, ratings = p.ooyalaplayer.getCurrentItemRatings(), i;
				for(i = 0; i < ratings.length; i++) {
					obj[i] = ratings[i];
				}
				return obj;
			}());
		})
    };

} (jQuery));

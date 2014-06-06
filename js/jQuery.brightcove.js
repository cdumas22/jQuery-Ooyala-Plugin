/*!
 * jQuery Brightcove Plugin
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
	TODO: get iOS playback working.  
		Start implementing other methods from api
 */
(function($) {
	var BRIGHTCOVE = ".brightcove",
		BRIGHTCOVE_PLAYER_CLASS = "jquery-brightcove-player",
		OPTS = "opts" + BRIGHTCOVE;
	var Brightcove = {};
	
	Brightcove.BrightcovePlayers = {};
	
	Brightcove.init = [];
	
	Brightcove.inited = false;
	
	$.brightcove = {};
	
	$.brightcove.callback = function(playerID) {
		var player = brightcove.getExperience(playerID), 
			experienceModule = player.getModule(APIModules.EXPERIENCE),
			videoPlayer = player.getModule(APIModules.VIDEO_PLAYER),
			onPlayerReady = function() {
				var playerEvents = $.brightcove.defaults.onPlayer,
					play = playerEvents.play[playerID];//,
					//seek = playerEvents.seek[playerID];
				
				for(var e in playerEvents) {
					var e2 = playerEvents[e][playerID],
						b2 = BCMediaEvent[e.toUpperCase()];
					videoPlayer.addEventListener(b2, e2);
				}
				videoPlayer.addEventListener(BCMediaEvent.BEGIN, $.brightcove.defaults.ready[playerID]);

			};
		
			if(experienceModule.getReady()) {
				onPlayerReady();
			} else {
			    experienceModule.addEventListener(BCExperienceEvent.TEMPLATE_READY, onPlayerReady);
			}
			
	};

	$.brightcove.defaults = {
		afterReady: function($player) {}, 
		ready: {},
        onPlayer: {
			begin: {},
			play: {},
			stop: {},
			seek: {},
			progress: {},
			volume_change: {},
			change: {},
			complete: {},
            buffer_begin: {},
			buffer_complete: {}
        }
	};
	
	var defaults = {
		height: 355,
		width: 425,
		videoId: "734462565001",
		playhead: 0,
		autoplay: false,

		/*player variables*/
		playerKey: "AQ~~,AAAADXdqFgE~,aEKmio9UXajW-cv0zfxA9HrUvcL8ic54",
		
		/*private variables*/
		playerID: "brightcovePlayerContainer",
		
		/*player events*/
		onStart: function( playerObject) {},
		onComplete: function (playerObject) {},
		onChangeVideo: function (playerObject) {},
		onPlay: function (playerObject) { },
        onPause: function (playerObject) { },
        onBuffering: function (playerObject) { },
        onSeek: function (playerObject) { },
		onPlayheadTimeChanged: function(playerObject) {},
		onVolumeChanged: function(playerObject) {}
	};
	
	
	
	Brightcove.initDefaults = function(d, o) {
		var ID = o.playerID; 
		
		// default onPlayer events
		var dp = d.onPlayer;
		dp.buffer_begin[ID] = o.onBuffering;
		dp.buffer_complete[ID] = o.onBuffering;
		dp.change[ID] = o.onChangeVideo;
		dp.begin[ID] = o.onStart;
		dp.complete[ID] = o.onComplete;
		dp.progress[ID] = o.onPlayheadTimeChanged;
		dp.play[ID] = o.onPlay;
		dp.stop[ID] = o.onPause;
		dp.seek[ID] = o.onSeek;
		dp.volume_change[ID] = o.onVolumeChanged;
		d.ready[ID] = function() {
			var mv = bcPlayer.getPlayer(o.playerID).getModule(APIModules.VIDEO_PLAYER);
			if(o.playhead > 0) {
				mv.seek(o.playhead);
				o.playhead = 0;
			}
			if(!o.autoplay) {
				mv.pause();
			}
		};
		
		
	};
	
	Brightcove.initPlayer = function($player, o) {				  
		//load all the scripts
		$.ajax({
			cache: true,
			dataType: "script",
			url: "http://admin.brightcove.com/js/BrightcoveExperiences.js",
			success: function() {
				$.ajax({
					cache: true,
					dataType: "script",
					url: "http://admin.brightcove.com/js/APIModules_all.js",
					success: function() {
						//create the player
						var params = '<param name="bgcolor" value="#000000"/>';
						params += '<param name="width" value="' + o.width + '" />';
						params += '<param name="height" value="' + o.height + '" />';
						params += '<param name="playerID" value="' + o.playerID+ '" />';
						params += '<param name="playerKey" value="' + o.playerKey + '" />';
						params += '<param name="isVid" value="true" />';
						params += '<param name="isUI" value="true" />';
						params += '<param name="dynamicStreaming" value="true" />';
						params += '<param name="@videoPlayer" value="' + o.videoId + '" />';
						params += '<param name="templateLoadHandler" value="$.brightcove.callback" />';
						
						jQuery("#" + o.playerID + "_c").append('<div style="display:none"></div>' +
									  '<object id="' + o.playerID + '" class="BrightcoveExperience">' +
										params + 
									  '</object>');
						Brightcove.BrightcovePlayers[o.playerID] = document.getElementById(o.playerID);
						brightcove.createExperiences();
					}
				});
			}
		});		
	};
	
	$.fn.brightcove = function(input, xtra) {
		var $this = $(this);

        var type = typeof input;

        if (arguments.length === 0 || type === "object") {
            return $this.each(function () {
                Brightcove.init($(this), input);
            });
        }
        else if (type === "string") {
			//PLAYER[input]();
            return $this.triggerHandler(input + BRIGHTCOVE, xtra || null);
        }
	};
	
	var buildFN = function(fn, after) {
		return function (evt, param) {
            var p = Brightcove.getPkg(evt);
            if (p.brightcoveplayer) {

                var ret = fn(evt, param, p);

                if (typeof (ret) == "undefined")
                    ret = p.$player;

                return ret;

            }
            return p.$player;
        };
	}
	
	$.brightcove.getPlayers = function() {
		return Brightcove.BrightcovePlayers;
	};
	
	Brightcove.init = function($player, opts) {
		if ($player.hasClass(BRIGHTCOVE_PLAYER_CLASS))
            return $player;
        var options = $.extend({}, defaults, opts);

        options.playerID = options.playerID + (Math.floor(new Date().valueOf() * Math.random()));

        $player.addClass(BRIGHTCOVE_PLAYER_CLASS).data(OPTS, options);
		
        for (e in PLAYER) {
            $player.bind(e + BRIGHTCOVE, $player, PLAYER[e]);
		}
		
        Brightcove.initDefaults($.brightcove.defaults, options);

        jQuery("<div></div>").attr("id", options.playerID + "_c").css({
				height: options.height,
				width: options.width,
				position: 'relative'
			}).appendTo($player);

        Brightcove.initPlayer($player, options);

        return $player;
	};
	
	Brightcove.getPkg = function (evt) {
		var $player = evt.data,
            opts = $player.data(OPTS),
            brightcoveplayer = bcPlayer.getPlayer(opts.playerID).getModule(APIModules.VIDEO_PLAYER);

        return {
            $player: $player,
            opts: opts,
            brightcoveplayer: brightcoveplayer
        };
	};
	
	var PLAYER = {
		play: buildFN(function (evt, param, p) {
            if (typeof (param) === "object") {
              p.opts.playhead = param.time;
			  p.brightcoveplayer.loadVideo(param.videoId);
            } else if (param) {
               p.brightcoveplayer.loadVideo(param);
            } else {
               p.brightcoveplayer.play();
            }
        }),

        pause: buildFN(function (evt, param, p) {
			p.brightcoveplayer.pause();
        }),

        seek: buildFN(function (evt, param, p) {
			p.brightcoveplayer.seek(param);
        }),
		
		fastforward: buildFN(function (evt, param, p) {
			var time = p.brightcoveplayer.getVideoPosition();
			p.brightcoveplayer.seek(time + param);
		}),
		
		rewind: buildFN(function(evt, param, p) {
			var time = p.brightcoveplayer.getVideoPosition();
			p.brightcoveplayer.seek(time - param);
		}),
		
        volume: buildFN(function(evt, param, p) {
			if(param){
				if(param > 1) param = param / 100;
				p.brightcoveplayer.setVolume(param);
			} else {
				return p.brightcoveplayer.getVolume(); //the volume
			}
		}),
		
		player: buildFN(function (evt, param, p) {
			return p.brightcoveplayer;
		}),
		
        destroy: buildFN(function (evt, param, p) {
            p.$player.removeClass(BRIGHTCOVE_PLAYER_CLASS)
                    .data(OPTS, null)
                    .unbind(BRIGHTCOVE)
                    .html("");
            delete Brightcove.BrightcovePlayers[p.opts.playerID];

            $(p.brightcoveplayer).remove();

            return null;
        }),
		
	};
}(jQuery));
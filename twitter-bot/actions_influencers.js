(function() {
  // Author: Matthew Rowlandson
  // Purpose: The action methods for the twitter bot, following influencers, retweeting tweets etc'

  const config = require('./config');
  const twitterConfig = config.twitter;
  const Twit = require('twit');
  const models = require('./models');
  const Influencer = models.Influencer;
  const TweetAnalysis = require('./tweet_analysis');

  let Twitter = new Twit(twitterConfig);
  let tAnalysis = null;

  // API METHODS : https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/overview
  // POST friendships/create : Allows the bot to follow a user [We follow new influencers, and continue to follow STRONG influencers]
  // POST friendships/destroy : Allows the bot to unfollow a user [we unfollow low scoring influencers]
  // GET followers/list : Allows us to get a list of people that follow the user
  // GET friends/ids : Allows us to get users that the specified user follows

  //https://stackoverflow.com/questions/9717488/using-since-id-and-max-id-in-twitter-api
  function decStrNum(n) {
    n = n.toString();
    var result = n;
    var i = n.length - 1;
    while (i > -1) {
      if (n[i] === "0") {
        result = result.substring(0, i) + "9" + result.substring(i + 1);
        i--;
      } else {
        result = result.substring(0, i) + (parseInt(n[i], 10) - 1).toString() + result.substring(i + 1);
        return result;
      }
    }
    return result;
  }

  module.exports = function(searchTerms) {
    tAnalysis = new TweetAnalysis(searchTerms);

    //get a list of people that follow the user
    this.getFollowersList = function(screenName) {
      return new Promise(function(resolve, reject) {
        //Grab a list of user ids that follow the user (NOTE: 5000 returned in one cursor) 
        Twitter.get('followers/ids', { screen_name: screenName }, function(err, data, response) {
          if (err || data.error) {
            reject(err);
          } else {
            if (data.next_cursor != 0) {
              console.log("NOTE TO SELF. Follower list is larger then 5K! Congrats cryptosense bot... now fix this code to get full list using cursors (data included in data obj)")
            }
            resolve(data.ids);
          }
        });
      });
    }

    //NOTE: Apparently we don't need to follow users to read al their tweets.
    // We are going to folllow influencers that have quality influence only
    this.follow = function(influencer) {
      return new Promise(function(resolve, reject) {
        if (influencer.followed == true) {
          return resolve(false);
        }
        Twitter.post('friendships/create', { screen_name: influencer.accountName }, function(err, data, response) {
          if (err) {
            reject(err);
          } else {
            influencer.update({ followed: true }, function(err, doc) {
              if (err) {
                reject("Update of influencer failed")
              } else {
                resolve(influencer.accountName);
              }
            })
          }
        });
      });
    }

    //This influencer didn't make the cut. So lets ignore
    this.unfollowInfluencer = function(influencer) {
      return new Promise(function(resolve, reject) {
        console.log("TODO");
      });
    }

    //Retrieves the users tweets : SEE HERE https://developer.twitter.com/en/docs/tweets/timelines/guides/working-with-timelines
    //@influencer : the influencer model instance
    this.getTweetsAndAnalyze = function(influencer) {
      var self = this;
      return new Promise(function(resolve, reject) {
        //use the max_id param to specify the ceiling of our cursor
        let maxId = null;
        let sinceID = influencer.sinceID;
        let maxID = influencer.maxID; //Greatest ID processed
        let params = {
          screen_name: influencer.accountName,
          count: 200, //MAX is 200
          trim_user: 1, //We don't need the user obj
          include_rts: 1, //include retweets as content
        };
        if (sinceID) {
          params.since_id = sinceID;
        }
        if (maxID) {
          params.max_id = maxID;
        }
        var before = influencer.tweets.length;
        Twitter.get("statuses/user_timeline", params, function(err, tweets, response) {
          if (err || response.statusCode != 200) {
            return reject(err || "Twitter returned an odd status code during tweet retrieval")
          } else {
            if (tweets.length == 0) {
              console.log("No tweets, done");

              var save = false;
              if (influencer.tweets.length > 0) {
                influencer.sinceID = influencer.tweets[influencer.tweets.length - 1].id;
                save = true;
              }
              var obj = { "totalInfluencerRelatedTweets": influencer.tweets.length, "analyzedTweetsCount": tweets.length, "searchTermsTweetsCount": 0 };

              if (save) {
                influencer.save(function(err) {
                  resolve(obj); //total
                })
              } else {
                resolve(obj);
              }
              return;
            }

            //For each tweet
            for (var i = 0; i < tweets.length; i++) {
              if (i == 0 && (influencer.maxID && tweets[i].id == influencer.maxID)) {
                //skip this one (we already analyzed it)
                continue;
              }
              //Analyze it, looking for search terms, articles (related to)
              var yes = tAnalysis.hasSearchTerms(tweets[i]);
              if (yes) {
                var strippedTweet = tAnalysis.buildTweetObject(tweets[i]);
                influencer.tweets.push(strippedTweet); //Save our related tweet
                //Is there more to get?
              } else {
                //No, ignore [Anything need to happen here?]
              }
            }

            //max_id Returns results with an ID less than (that is, older than) or equal to the specified ID
            influencer.maxID = maxID = decStrNum(tweets[tweets.length - 1].id);

            if (influencer.sinceID)
              influencer.sinceID = null; //Not needed after the first query

            //Save the influencer data.
            influencer.tweetsAnalyzedCount = (influencer.tweetsAnalyzedCount || 0) + tweets.length;
            if (before != influencer.tweets.length) {
              console.log(influencer.tweets[influencer.tweets.length - 1].text);
            }
            influencer.save(function(err) {
              if (err) {
                console.log("influencer save error", err);
                return reject("Issue saving influencer" + err);
              }
              if (before != influencer.tweets.length) {
                //something has changed
                console.log("B:", before, "now:", influencer.tweets.length, "analyzed total:", influencer.tweetsAnalyzedCount);
              }

              influencer.save(function(err) {
                //totalInfluencerRelatedTweets, analyzedTweetsCount, searchTermsTweetsCount
                resolve({ "totalInfluencerRelatedTweets": influencer.tweets.length, "analyzedTweetsCount": tweets.length, "searchTermsTweetsCount": (influencer.tweets.length - before) || 0 });
              });

            });
          }
        });
      });
    }
  };
}());
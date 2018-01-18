(function() {
  const Chalk = require('chalk');
  const config = require('./config');
  const twitterConfig = config.twitter;
  const Twit = require('twit');

  let Twitter = new Twit(twitterConfig);

  var params = {
    q: '#bitcoin, #Bitcoin, #BITCOIN', // REQUIRED
    result_type: 'recent',
    lang: 'en'
  }
  Twitter.get('search/tweets', params, function(err, data) {
    // if there no errors
    if (!err) {
      // grab ID of tweet to retweet
      var retweetId = data.statuses[0].id_str;

      for (var i = 0; i < data.statuses.length; i++) {
        console.log(data.statuses[i].text);
      }
      // Tell TWITTER to retweet
      // Twitter.post('statuses/retweet/:id', {
      //   id: retweetId
      // }, function(err, response) {
      //   if (response) {
      //     console.log('Retweeted!!!');
      //   }
      //   // if there was an error while tweeting
      //   if (err) {
      //     console.log('Something went wrong while RETWEETING... Duplication maybe...');
      //   }
      // });
    }
    // if unable to Search a tweet
    else {
      console.log('Something went wrong while SEARCHING...');
    }
  });


}());
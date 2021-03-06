var utils = require(__dirname + '/utils.js');
var uuid  = require('node-uuid');
var os    = require('os');
// var i18n  = require('i18n');
// var time  = require('time');

var publish = function(eventType, args, callback){
  var self = this;
  var queue = self.options.incommigQueue;
  var klass = self.options.busDriverClassKey;

  payload = [publishMetadata(eventType, args)];

  self.queueObject.enqueue(queue, klass, payload, function(err, toRun){
    if(typeof callback === 'function'){ callback(err, toRun); }
  });
}

var publishAt = function(timestamp, eventType, args, callback){
  var self = this;
  var queue = self.options.incommigQueue;
  var klass = self.options.busPublisherClassKey;

  payload = [publishMetadata(eventType, args)];
  if(payload["bus_delayed_until"] == null){
    payload["bus_delayed_until"] = Math.floor(timestamp/1000);
  }
  delete payload['bus_published_at']; // will get re-added upon re-publish

  self.queueObject.enqueueAt(timestamp, queue, klass, payload, function(){
    if(typeof callback === 'function'){ callback(); }
  });
}

var publishIn = function(time, eventType, args, callback){
  var self = this;
  var timestamp = new Date().getTime() + time;
  self.publishAt(timestamp, eventType, args, callback);
}

var publishMetadata = function(eventType, args){
  var payload = {};
  if(eventType != null){
    payload['bus_event_type'] = eventType
  } else {
    payload['bus_event_type'] = null;
  }
  payload['bus_created_at']   = utils.timestamp(); // TODO: get this back in ruby resque-bus
  payload['bus_published_at'] = utils.timestamp();
  payload['bus_id']           = utils.timestamp() + "-" + uuid.v4();
  payload['bus_app_hostname'] = os.hostname();
  // payload['bus_locale']       = i18n.getLocale();
  // payload['bus_timezone']     = time.currentTimezone; 

  for(var i in args){
    payload[i] = args[i];
  }

  return payload;
}

var publisherJob = function(){
  return {
    plugins: [],
    pluginOptions: [],
    perform: function(args, callback){
      var self = this;

      self.bus.publish(args['bus_event_type'], args, function(err){
        callback(err, self.options.busDriverClassKey);
      });
    } 
  }
}

exports.publish      = publish;
exports.publishAt    = publishAt;
exports.publishIn    = publishIn;
exports.publisherJob = publisherJob;
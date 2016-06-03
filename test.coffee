
MetrichorAPI = require('./lib/app.coffee')
app = require('express')().listen 3000
metrichor = new MetrichorAPI
  apikey: "534373b27eaf4b2e448c1d4c930701f1631d115a"
  inputFolder: "/Users/dvinyard/Documents/Dev/api/input"
  outputFolder: "/Users/dvinyard/Documents/Dev/api/output"
  url: "https://dev.metrichor.com"
  agent_version: '2.50.0'

metrichor.on 'progress', (stats) ->
  # console.log stats.upload

metrichor.on 'status', (status) ->
  console.log status

# metrichor.api.getAppConfig 627, (error, json) ->
#   console.log error, json


process.stdin.resume().setEncoding('utf8').on 'data', (text) ->
  command = text.replace '\n', ''
  command_param = command.split ' '

  if command is 'create'
    return metrichor.create { app: 627 }, (error) =>
      console.log error if error

  if command is 'reset'
    return metrichor.resetLocalDirectory (error) =>
      console.log error if error

  if command is 'stop'
    return metrichor.stop (error) =>
      console.log error if error

  if command is 'pause'
    return metrichor.pause (error) =>
      console.log error if error

  if command is 'resume'
    return metrichor.resume (error) =>
      console.log error if error

  if command is 'join'
    return metrichor.join 62750, (error) =>
      console.log error if error

  if command_param.length
    if command_param[0] is 'join'
      instance_id = command_param[1]
      return metrichor.join instance_id, (error) =>
        console.log error if error

    if command_param[0] is 'create'
      app_id = command_param[1]
      return metrichor.create { app: app_id }, (error) =>
        console.log error if error

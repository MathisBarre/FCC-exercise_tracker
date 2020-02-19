// use /api/exercise

const express = require('express')
const mongoose = require('mongoose')
var router = express.Router();

function isDate(date) {
  return date instanceof Date && !isNaN(date)
}

// Create user shema
const userSchema = new mongoose.Schema({
  username : {
    type : String,
    required : true
  },
  logs: [{
    description : { type : String },
    duration: { type : Number },
    date: { type: Date }
  }]
})

// Create user model
const User = mongoose.model('user', userSchema)

// ROUTES
// When the user try to add a new user in db
router.post('/new-user', (req,res) => {
  const reqUsername = req.body.username
  
  // Try to find if an user already exist
  User.findOne({ username: reqUsername}, (error, userFound) => {
    if (error) console.error(error.message)
    
    // If username already exist, send warning
    if (userFound) res.send('The username is already taken')
    
    // If the username is free (userName =/= null & undefined), create new user document
    else {
      // Create new user document
      const newUser = new User({
        username: reqUsername,
        logs: []
      })
      
      // Save the new user in db
      newUser.save((error, userSaved) => {
        if (error) console.error(error.message)
        
        // Return the saved user
        res.json(userSaved)
      })
    }
  })
})

// When user want to retrive the list of all user
router.get('/users', (req, res) => {
  // Just find all the users
  User.find({}, (error, data) => {
    if(error) console.error(error.message)
    
    // And send all the data found
    res.json(data)
  })
})

// When an user try to add an exercise
router.post('/add', (req, res) => {
  // Retrive and assign the input
  const { userId, description: desc, duration, date: dateString } = req.body
  
  // Transform date into a real one
  const date = (dateString) ? new Date(dateString.replace(/-/g, ' ')) : new Date(Date.now())
  if (!isDate(date)) return res.send('Invalid date')
  const log = {
    desc,
    duration,
    date
  }
  // Add log into logs
  User.findByIdAndUpdate
  (
    userId,
    {
      // Changes (here push log to logs)
      $push: { logs : log }
    },
    {
      // Options
      new: true, // Return modified user...
      lean: true, // ...as plain javascript
      omitUndefined: true, // Don't add undefined value
    },
    (error, userUpdated) => {
      if (error) console.error(error.message)
      
      // Return new user
      res.json(userUpdated)
    }
  )
})

// When a user what to retrieve logs
router.get('/log', (req, res) => {
  // Get params
  let {userId, from , to , limit } = req.query
  console.log(`limit : ${limit}\nfrom : ${from}\nto : ${to}\nuserId : ${userId}`)

  // Change variable on undefined
  limit = (limit && !isNaN(parseInt(limit))) ? limit : Infinity
  from = (new Date(from) != "Invalid Date") ? new Date(from) : new Date("1900")
  to =  (new Date(to) != "Invalid Date") ? new Date(to) : new Date(Date.now())
  console.log('----------------------------------------------------------------')
  console.log(`limit : ${limit}\nfrom : ${from}\nto : ${to}\nuserId : ${userId}`)

  // The user
  User.findById(userId)
    .select('logs')
    .setOptions({ lean : true })
    .exec((error, data) => {
      if(error) console.error(error.message)
      let logs = [...data.logs]

      // Filter unsolicited dates
      logs = logs.filter((log) => log.date.getTime() >= from.getTime() && log.date.getTime() <= to.getTime())

      // Sort logs
      logs = logs.sort((a,b) => {
        return b.date.getTime() - a.date.getTime()
      })

      logs = logs.slice(0,limit)
      // Return logs
      res.json({
        count: logs.length,
        logs
      })
    })
})

module.exports = router
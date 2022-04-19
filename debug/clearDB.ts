import level from 'level-ts'
import yargs from 'yargs/yargs'

const argv = yargs(process.argv.slice(2)).options({
  file: {type: 'string'}
}).parseSync()

const db = new level(argv.file);
db.put()
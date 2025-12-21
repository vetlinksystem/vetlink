const chalk = require('chalk')

const logError = (err, req) => {
  console.log(chalk.red.bold('\n====================== 🔥 ERROR CAUGHT 🔥 ======================'));

  console.log(chalk.redBright.bold('📌 MESSAGE:'), chalk.white(err.message));

  console.log(chalk.redBright.bold('📄 STACK TRACE:'));
  console.log(chalk.gray(err.stack));

  console.log(chalk.redBright.bold('🌐 ROUTE:'), chalk.white(`${req.method} ${req.originalUrl}`));

  if (req.body && Object.keys(req.body).length > 0) {
    console.log(chalk.redBright.bold('📦 REQUEST BODY:'), chalk.yellow(JSON.stringify(req.body)));
  }

  if (req.query && Object.keys(req.query).length > 0) {
    console.log(chalk.redBright.bold('🔍 QUERY PARAMS:'), chalk.yellow(JSON.stringify(req.query)));
  }

  console.log(chalk.red.bold('===============================================================\n'));
};

module.exports = logError;
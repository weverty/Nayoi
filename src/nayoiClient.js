const { Client, Collection } = require('discord.js');
const Langs = require('./structures/langs.js');
const Database = require('./structures/database.js');
const Error = require('./structures/error.js');
const Canvas = require('./structures/canvas.js');
const Logger = require('./structures/logger');
const { readdir } = require('fs');

/** 
* @extends Discord.Client
*/
class NayoiClient extends Client {
    /**
    * @param {Object} options The options passed to the NayoiClient
    * @param {Object} options.clientOptions Client options used by discord.js Client
    * @param {Object} options.config Config filepath 
    */
    constructor(options) {
        super(options.clientOptions || {});

        options.config.prefix ? this.prefix = options.config.prefix : this.prefix = "n!";
        options.config.color ? this.baseColor = options.config.color : this.baseColor = "#ff8ff2";
        options.config.apis ? this.apis = options.config.apis : this.apis = {weatherApi: "", tenorApi: "", twitchID: ""};

        this.logger = new Logger();
        this.database = new Database(this, options.config.mongodb);
        this.langs = new Langs(this);
        this.error = new Error(this, true);
        
        this.snipes = new Map();
        this.commands = new Collection();
        this.aliases = new Collection();
        this.lists = new Collection();

        this.loadEvents("./events");

        const commands = require("./structures/command");
        commands.run(this);

        const lists = require("./structures/list");
        lists.run(this);
    }

    /**
    * @param {String} token Discord token 
    */
    login(token) {
        super.login(token);
        return this;
    }

    canvas(){
        return new Canvas();
    }

    /**
    * @param {String} path Events path 
    */
    loadEvents(path) {
        readdir(path, (err, files) => {
            if (err) console.log(err);
            files.forEach(evt => {
                const event = new (require(`.${path}/${evt}`))(this);
                super.on(evt.split(".")[0], (...args) => event.run(...args));
            });
            
            this.logger.info(`${files.length} eventos carregados`, 'events');
        });
        return this;
    }
}

module.exports = NayoiClient;

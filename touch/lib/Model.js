Ext.define('CouchDB.data.Model', {
    extend: 'Ext.data.Model',
    alias: 'couchdb.model',
    config: {
        fields: [{
            name: '_id',
            type: 'string'
        },{
            name: '_rev',
            type: 'string'
        }],

        idProperty: '_id'
    }

});
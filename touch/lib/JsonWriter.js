Ext.define('CouchDB.data.Writer', {
    extend: 'Ext.data.writer.Json',
    alias: 'writer.couchdb',

    allowSingle: true,
    encode: false,
    writeAllFields: true,
    root: undefined,

    getRecordData: function(record) {
        var data =  this.callParent(arguments);

        // Remove falsey _id and _rev properties before writing the object.  This is necessary
        // when POSTing a new object to CouchDB because Ext seems to insist on always writing
        // these two properties, even if they are not initially defined on the object.
        if (data._id) {
            //fix for phantom record id's
            if (data._id.match(/ext-record/)){
                delete data._id;
            }
        } else {
            delete data._id;
        }

        if (!data._rev) {
            delete data._rev;
        }

        // Assign the Ext class so view map functions can differentiate in a mixed-document database.
        // Example map function:
        //   function(doc) {
        //     if (doc.type === 'My.Ext.ClassName') {
        //       emit(null, null);
        //     }
        //   }
        data.type = Ext.getClassName(record);

        return data;
    }
});
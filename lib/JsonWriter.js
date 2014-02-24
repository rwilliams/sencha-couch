/**
 * An overridden JsonWriter implementation that allows the Model to define how data should be written.
 *
 * If the Model being written has 'writeStructuredData' set to true, it will allow the Model to determine the data
 * format being sent during create and update operations. MC.data.Model provides a default implementation but
 * any Model can then override this behavior to handle any non-standard boundary conditions where necessary.
 */
Ext.define('CouchDB.data.JsonWriter', {
    extend: 'Ext.data.writer.Json',
    alias: 'writer.couchdb',

    getRecordData: function(record, operation) {
        var data;
        data = record.getWriteData();

        
        // Remove falsey _id and _rev properties before writing the object.  This is necessary
        // when POSTing a new object to CouchDB because Ext seems to insist on always writing
        // these two properties, even if they are not initially defined on the object.
        if (!data._id) {
            delete data._id;
        }
        if (!data._rev) {
            delete data._rev;
        }

        data.type = Ext.getClassName(record);

        return data;
    }
});
Ext.define('CouchDB.data.Model', {
    extend: 'Ext.data.Model',
    alias: 'couchdb.model',
    writeStructuredData: true,
    writeAllFields: true,
    config: {
        fields: [{
            name: '_id',
            type: 'string'
        },{
            name: '_rev',
            type: 'string'
        }],
        idProperty: '_id'
    },
    getWriteData: function() {

        var data = this.getRecordWriteData(this),
            associations = this._associations.items,
            association, type, name, associatedStore, associatedRecords, associatedRecord,
            i, len, j, jLen,
            phantom = this.phantom,
            writeAllFields = this.writeAllFields;

        //debugger;
        for (i=0, len=associations.length; i<len; i++) {

            association = associations[i];
            type = association._type;
            name = association._name;

            if (type == 'hasmany') {

                associatedStore = this[association._storeName];

                if (associatedStore) {

                    //Only write the association if it's an insert, it's specifically required or there are changes
                    if (phantom || writeAllFields || associatedStore.getModifiedRecords().length > 0) {

                        //we will use this to contain each associated record's data
                        data[name] = [];

                        //if it's loaded, put it into the association data
                        if (associatedStore.getCount() > 0) {
                            associatedRecords = associatedStore._data.items;

                            //now we're finally iterating over the records in the association. Get
                            // all the records so we can process them
                            for (j=0, jLen=associatedRecords.length; j<jLen; j++) {
                                data[name][j] = this.getRecordWriteData(associatedRecords[j]);
                            }
                        }
                    }

                }

            } else if (type == 'hasOne') {
                associatedRecord = this[association.instanceName];
                // If we have a record and it has changed, put it onto our list
                if (associatedRecord !== undefined && associatedRecord.dirty) {
                    data[name] = this.getRecordWriteData(associatedRecord);
                }
            }

        }

        return data;
    },

    getRecordWriteData: function(record) {
        var isPhantom = record.phantom === true,
            writeAllFields = record.writeAllFields || isPhantom,
            fields = record._fields,
            fieldItems = fields.items,
            data = {},
            changes,
            field,
            key,
            f, fLen,
            forcePersist;

        changes = record.getChanges();

        for (f=0, fLen=fieldItems.length; f<fLen; f++) {
            field = fieldItems[f];
            //if (field.forcePersist || (field.persist && writeAllFields)) {
                this.setFieldWriteData(data, record, field);
            //}
        }

//        for (key in changes) {
//            if (changes.hasOwnProperty(key)) {
//                field = fields.get(key);
//
//                if (field.persist) {
//                    this.setFieldWriteData(data, record, field, changes[key]);
//                }
//            }
//        }

        return data;
    },

    setFieldWriteData: function(data, record, field, value) {
        var name = field[this.nameProperty] || field._name,
            path, i, len, curr;

        if (!value) {
            value = record.get(field._name);
        }

        // Skip the id field for phantom records
        if (field._name === record._idProperty && record.phantom) {
            return;
        }

        if (record.phantom && field._name === '_rev') {
            return;
        }

        if (field._mapping) {
            if (field._mapping.indexOf('.')) {
                path = field._mapping.split('.');
                curr = data;
                for (i=0, len=path.length-1; i<len; i++) {
                    if (!curr[path[i]]) {
                        curr[path[i]] = {};
                    }
                    curr = curr[path[i]];
                }
                curr[path[i]] = value;
            }
        } else {
            data[name] = value;
        }
    }

});
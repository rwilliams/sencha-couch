Ext.override('Ext.data.association.HasMany', {
    read: function(record, reader, associationData) {
        var store = record[this.getName()](),
            records = reader.read(associationData).getRecords();

        store.add(records);

        if (this.inner) {
            store.data.each(function(associatedRecord){
                associatedRecord.innerOf = record;
            });
        }
    }
});
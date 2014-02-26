Ext.define('CouchDB.data.NestedModel', {
    extend: 'Ext.data.Model',
    alias: 'couchdb.nestedmodel',
    validate: function() {
        var errors      = Ext.create('Ext.data.Errors'),
            validations = this.getValidations().items,
            validators  = Ext.data.Validations,
            inners      = this.inners,
            innerFn     = function (record) {
                var errs = record.validate();
                if (!errs.isValid()) {
                    errors.addAll(errs.items);
                }
            },
            length, validation, field, valid, type, i;

        if (validations) {
            length = validations.length;

            for (i = 0; i < length; i++) {
                validation = validations[i];
                field = validation.field || validation.name;
                type  = validation.type;
                valid = validators[type](validation, this.get(field));

                if (!valid) {
                    errors.add(Ext.create('Ext.data.Error', {
                        field  : field,
                        value  : this.get(field),
                        message: validation.message || validators.getMessage(type)
                    }));
                }
            }
        }

        Ext.iterate(this.associations.map, function (key, value, scope) {
            if (value.config.inner === true) {
                this[key]().each(innerFn);
            }
        }, this);

        return errors;
    },
    constructor: function(data, id, raw, convertedData) {
        var me = this,
            cached = null,
            useCache = me.getUseCache(),
            idProperty = me.getIdProperty();

        data = data || convertedData || {};

        // We begin by checking if an id is passed to the constructor. If this is the case we override
        // any possible id value that was passed in the data.
        if (id || id === 0) {
            // Lets skip using set here since it's so much faster
            data[idProperty] = me.internalId = id;
        }

        // If we have an id set in the data we check to see if we already have a cached instance
        // of this record. If that's the case then we just return that instance with the updated data
        // passed to this constructor.
        id = data[idProperty];
        if (useCache && (id || id === 0)) {
            cached = Ext.data.Model.cache[Ext.data.Model.generateCacheId(this, id)];
            if (cached) {
                cached.raw = raw || cached.raw;
                return cached.mergeData(convertedData || data || {});
            }
        }

        /**
         * @property {Object} modified key/value pairs of all fields whose values have changed.
         * The value is the original value for the field.
         */
        me.modified = {};
        me.unsetDirty();

        /**
         * @property {Object} raw The raw data used to create this model if created via a reader.
         */
        me.raw = raw || data || {};

        /**
         * @property {Array} stores
         * An array of {@link Ext.data.Store} objects that this record is bound to.
         */
        me.stores = [];

        if (convertedData) {
            me.setConvertedData(data);
        } else {
            me.setData(data);
        }

        // me.id is always set to be randomly generated and should only be used for binding Observable events!
        me.id = me.getIdentifier().generate(me);

        // If it does not have an id in the data at this point, we use the one generated by the id strategy.
        // This means that we will treat this record as a phantom record from now on
        id = me.data[idProperty];
        if (!id && id !== 0) {
            me.data[idProperty] = me.internalId = me.id;
            me.phantom = true;

            // If we only now set an id on this model, it means we setData won't have handled the inline
            // association data, which we will have to do now then.
            if (this.associations.length) {
                this.handleInlineAssociationData(data);
            }
        }
        else {
            // We also want to make sure that the internalId has the same value as the id in
            // the data object.
            this.internalId = id;
        }

        if (useCache) {
            Ext.data.Model.cache[Ext.data.Model.generateCacheId(me)] = me;
        }

        if (this.init && typeof this.init == 'function') {
            this.init();
        }
    },
    set: function(fieldName, value) {
        var me = this,
        // We are using the fields map since it saves lots of function calls
            fieldMap = me.fields.map,
            modified = me.modified,
            notEditing = !me.editing,
            modifiedCount = 0,
            modifiedFieldNames = [],
            field, key, i, currentValue, ln, convert;

        /*
         * If we're passed an object, iterate over that object. NOTE: we pull out fields with a convert function and
         * set those last so that all other possible data is set before the convert function is called
         */
        if (arguments.length == 1) {
            for (key in fieldName) {
                if (fieldName.hasOwnProperty(key)) {
                    //here we check for the custom convert function. Note that if a field doesn't have a convert function,
                    //we default it to its type's convert function, so we have to check that here. This feels rather dirty.
                    field = fieldMap[key];
                    if (field && field.hasCustomConvert()) {
                        modifiedFieldNames.push(key);
                        continue;
                    }

                    if (!modifiedCount && notEditing) {
                        me.beginEdit();
                    }
                    ++modifiedCount;
                    me.set(key, fieldName[key]);
                }
            }

            ln = modifiedFieldNames.length;
            if (ln) {
                if (!modifiedCount && notEditing) {
                    me.beginEdit();
                }
                modifiedCount += ln;
                for (i = 0; i < ln; i++) {
                    field = modifiedFieldNames[i];
                    me.set(field, fieldName[field]);
                }
            }

            if (notEditing && modifiedCount) {
                me.endEdit(false, modifiedFieldNames);
            }
        } else if(modified) {
            field = fieldMap[fieldName];
            convert = field && field.getConvert();
            if (convert) {
                value = convert.call(field, value, me);
            }

            currentValue = me.data[fieldName];
            me.data[fieldName] = value;

            if (field && !me.isEqual(currentValue, value)) {
                if (modified.hasOwnProperty(fieldName)) {
                    if (me.isEqual(modified[fieldName], value)) {
                        // the original value in me.modified equals the new value, so the
                        // field is no longer modified
                        delete modified[fieldName];
                        // we might have removed the last modified field, so check to see if
                        // there are any modified fields remaining and correct me.dirty:
                        me.dirty = false;
                        for (key in modified) {
                            if (modified.hasOwnProperty(key)) {
                                me.dirty = true;
                                break;
                            }
                        }
                    }
                } else {
                    me.setDirty();
                }
            }

            if (notEditing) {
                me.afterEdit([fieldName], modified);
            }
        }
    },
    setDirty : function() {
        var me = this,
            name;

        me.dirty = true;

        me.fields.each(function(field) {
            if (field.getPersist()) {
                name = field.getName();
                me.modified[name] = me.get(name);
            }
        });

        if (me.innerOf) {
            me.innerOf.setDirty();
        }
    },
    unsetDirty : function() {
        var me = this;

        me.dirty = false;
        me.editing = false;
        me.modified = {};

        Ext.iterate(me.associations.map, function (key, value, scope) {
            if (value.config.inner === true) {
                this[key]().each(function (record) {
                    record.unsetDirty();
                });
            }
        }, me);
    },
    reject: function(silent) {
        var me = this,
            modified = me.modified,
            field;

        for (field in modified) {
            if (modified.hasOwnProperty(field)) {
                if (typeof modified[field] != "function") {
                    me.data[field] = modified[field];
                }
            }
        }

        me.unsetDirty();

        if (silent !== true) {
            me.afterReject();
        }
    },
    commit: function(silent) {
        var me = this,
            modified = this.modified;

        me.phantom = false;
        me.unsetDirty();

        if (silent !== true) {
            me.afterCommit(modified);
        }
    },
    save: function(options, scope) {

        if (this.innerOf) {
             return this.innerOf.save(options,scope);
        }

        var me     = this,
            action = me.phantom ? 'create' : 'update',
            proxy  = me.getProxy(),
            operation,
            callback;

        if (!proxy) {
            Ext.Logger.error('You are trying to save a model instance that doesn\'t have a Proxy specified');
        }

        options = options || {};
        scope = scope || me;

        if (Ext.isFunction(options)) {
            options = {
                callback: options,
                scope: scope
            };
        }

        Ext.applyIf(options, {
            records: [me],
            action : action,
            model: me.self
        });

        operation = Ext.create('Ext.data.Operation', options);

        callback = function(operation) {
            if (operation.wasSuccessful()) {
                Ext.callback(options.success, scope, [me, operation]);
            } else {
                Ext.callback(options.failure, scope, [me, operation]);
            }

            Ext.callback(options.callback, scope, [me, operation]);
        };

        proxy[action](operation, callback, me);

        return me;
    }

});
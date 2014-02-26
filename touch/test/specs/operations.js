
describe("CRUD Operations", function() {
  Ext.define('Person', {
    extend: 'CouchDB.data.Model',
      config: {
        fields: [{
          name: 'name',
          type: 'string'
        },{
          name: 'age',
          type: 'int'
        }],
          associations: [
              {type: 'hasMany', model: 'Dog',    name: 'dogs'}
          ],
        proxy: {
          type: 'couchdb',
          databaseUrl: 'http://localhost:3000',
          databaseName: 'sencha_couch_test',
          designName: 'test',
          viewName: 'people'
        }
    }
  });

    Ext.define('Dog', {
        extend: 'Ext.data.Model',
        config: {
            fields: [{
                name: 'name',
                type: 'string'
            },{
                name: 'color',
                type: 'string'
            }],
            belongsTo: 'Person'
        }
    });
  
  var store = Ext.create('Ext.data.Store',{
    storeId: 'testStore',
    model: 'Person'
  });
    beforeEach(function(done) {
        var db = new PouchDB('http://localhost:3000/sencha_couch_test');
        db.put({
            "_id": "_design/test",
            "language": "javascript",
            "views": {
                "people": {
                    "map": "function(doc) { emit(doc._id, null); };"
                }
            }
        }, function(err, response) {
            expect(err).toBeNull();
            done();
        });
    });

    afterEach(function(done) {
        PouchDB.destroy('http://localhost:3000/sencha_couch_test', function(err, info) {
            expect(err).toBeNull();
            done();
        });
    });

  it('can create and load a new Model object', function(done) {
    var id;
    var rev;

    var person = new Person({ name: 'Ralph', age: 30 });
    id = person.getId();
    expect(id).toMatch(new RegExp("ext-record"));


    person.save({
      callback: function(){
          id = person.getId();
          rev = person.get('_rev');
          expect(id).toBeDefined();
          expect(person.get('_id')).toBe(id);
          expect(rev).toBeDefined();
          expect(person.get('name')).toBe('Ralph');
          expect(person.get('age')).toBe(30);
          person = null;

          Person.load(id,{
              callback: function(person, operation) {
                 expect(person).toBeDefined();
                 expect(person.getId()).toBe(id);
                 expect(person.get('_id')).toBe(id);
                 expect(person.get('_rev')).toBe(rev);
                 expect(person.get('name')).toBe('Ralph');
                 expect(person.get('age')).toBe(30);
                 done();
              }
          });
      }
    });
  });

  it('can update an existing Model object', function(done) {
    var id;
    var rev;
    var person = new Person({ name: 'Ralph', age: 31 });

    person.save({
       callback: function(){
           id = person.getId();
           rev = person.get('_rev');
           person = null;
           expect(person).toBeNull();
           Person.load(id, {
               success: function(record, operation) {
                   person = record;
                   person.set('name', 'Fred');
                   person.set('age', 21);
                   person.save({
                       callback: function(){
                           person = null;
                           Person.load(id, {
                               success: function(record, operation) {
                                   person = record;
                                   expect(person).toBeDefined();
                                   expect(person.getId()).toBe(id);
                                   expect(person.get('_rev')).toBeDefined();
                                   expect(person.get('_rev')).not.toBe(rev);
                                   expect(person.get('name')).toBe('Fred');
                                   expect(person.get('age')).toBe(21);
                                   done();
                               }
                           });
                       }
                   });
               }
           });
       }
    });
  });

  it('can delete a Model object', function(done) {
     var id,
         person = new Person({ name: 'Ralph', age: 32 });

     person.save({
         callback: function(){
             id = person.getId();
             person = null;
             Person.load(id, {
                 success: function(record, operation) {
                     person = record;
                     person.erase({
                         callback: function(){
                             Person.load(id, {
                                callback: function(record, operation) {
                                    expect(record).toBeNull();
                                    done();
                                }
                             });

                         }
                     });
                 }
             });
         }
     });
  });

  it('can load all Model objects using a Store', function(done) {
    var person1 = new Person({ name: 'Ralph', age: 33 }),
         person2 = Ext.create('Person',{ name: 'Jane', age: 43 }),
         person3 = Ext.create('Person',{ name: 'David', age: 53 }),
         allPeople = 0,
         addPerson;

    person1.save({
        callback: function(person,request){
            store.add(person);
            addPerson();
        }
    });

    person2.save({
        callback: function(person,request){
            store.add(person);
            addPerson();
        }
    });

    person3.save({
        callback: function(person,request){
            store.add(person);
            addPerson();
        }
    });

    addPerson = function(){
      allPeople++;
      if (allPeople === 3){
          expect(store.getRange().length).toBe(3);
          done();
      }
    };
  });

  it('can read and write nested data',function(done){
      var person = new Person({ name: 'Ralph', age: 30 }),
          dog = new Dog({name:'Fido',color:'Yellow'});
      person.dogs().add(dog);
      person.save({
          callback: function(person,request){
              Person.load(person.getId(),{
                  callback: function(person, operation) {
                     expect(person.dogs().first().get('color')).toBe('Yellow');
                     expect(person.dogs().first().get('name')).toBe('Fido');
                     done();
                  }
              });
              //done();
          }
      });
  });
});
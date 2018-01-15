# Data-pipes, select functionality
This exploratory repository presents a first approach to the implementation of the *select* functionality. This functionality extends the dataNugget protocol as defined in the [data-pipes](https://github.com/olange/data-pipes) project.

The *select* function creates a reference to a path in a dataNugget. This allows one to pass smaller sections (from a larger nested collection) to portions of an application, while maintaining a central point aware of changes. Our implementation relies on the [immutable-cursor](https://github.com/redbadger/immutable-cursor) library.

## Usage

Given a **dataNugget**, a **path** and a **callback**, the *select* function returns a **dataNugget/dataEgg** representing the data at the given path.  
We expect this newly created subset of the data to be able to notify mutations. To accomplish this, the *data* property is wrapped in an [immutable cursor](https://github.com/redbadger/immutable-cursor). The *callback* argument is passed to the cursor and signals its mutations.


```javascript
// define a GQL formatted typedefs string
// with the exception that we use the "Data" type to define the entry point 
const typeDefs = `
  type Data {
    data: [Person]
  }
  type Person {
    name: String
    age: Int
    scores: [Int!]!
    friend: Person
  } 
`

// a plain js value conforming to previously defined typeDefs…
const valueJs = [
  {name:"Sonic", 
    age: 30,
    scores: [1, 2, 3],
    friend: { name: "Knuckles", age: 32, scores: [3, 2, 1], friend: null }
  },
  {name:"Mario", 
    age: 40,
    scores: [3, 2, 1],
    friend: null 
  } 
];

// construct a DataNugget with the value and schema 
const value = Immutable.fromJS(valueJs);
const schema = schemaFromTypeDefs(typeDefs);
const dataNugget = Immutable.Map({data:value, schema:schema});

// define a callback to signal mutations on dataEgg
const cb = (nextValue, prevValue, keyPath) => {
  console.log('Value changed from', prevValue, 'to', nextValue, 'at', keyPath);
};

const dataEgg = select(dataNugget, ['0','scores'], cb);

// modifications to the dataEgg are signalled by the execution of the callback
dataEgg.setIn(['data', '0'], 42);
  
```

## Installation

Install dependencies.

```
  $ bower install
  $ npm install
```

Run development server.

```
  $ npm run start
```

# data-pipes select

This exploratory repo implements a version of the *select* function with the [immutable-cursor](https://github.com/redbadger/immutable-cursor) library.


## Select

given a **dataNugget**, a **path** and a **callback**, return a **dataNugget/dataEgg** such as its data property is wrapped in an immutable cursor, and its schema points to the selected path.
The callback signals mutations of the cursor.

```javascript

// 1 build a DataNugget (immutable value + schema)

// define GQL typedef
// "Data" defines entry point 
const typeDefs = `
  type Data {
    data: [Person]
  }
  type Person {
    name: String
    age: Int
    scores: [Int!]!
    friend:Person
  } 
`

//  a plain js value conforming to previously defined typeDefs…
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
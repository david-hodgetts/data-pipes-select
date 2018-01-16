
import { select, schemaFromTypeDefs } from './select-explore.js'

// define some schema in the 'typeDefs' format (GQL).
// Note that the usual "Query" entry point is here replaced by the name "Data" .
// This is purely for readability reasons ('Data' is renamed to 'Query' before parsing)
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

// a plain js value conforming to the previously defined typeDefs.
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

// get an immutable value from the plain js object.
// Will be assigned to the data prop of a dataNugget.
const value = Immutable.fromJS(valueJs);

// define a callback function to notify us of changes on the dataEgg.
const cb = (nextValue, prevValue, keyPath) => {
  console.log('Value changed from', prevValue, 'to', nextValue, 'at', keyPath);
};

// make variables accessible from dev console for live exploration.
window.typeDefs = typeDefs;
window.schema = schemaFromTypeDefs(typeDefs);
window.dataNugget = Immutable.Map({data:value, schema:schema});
// create a dataEgg pointing to the first item of the list
window.dataEgg = select(dataNugget, ['0'], cb);

// modifications to the dataEgg are signalled by the execution of the callback.
dataEgg.setIn(['data', 'age'], 42);

// create a second dataEgg deriving from the first.
window.otherDataEgg = select(dataEgg, ['friend']);
// modifications to descendents of a dataEgg are also signalled by the execution of the callback.
otherDataEgg.setIn(['data', 'name'], "Wario");
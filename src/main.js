
import { select, schemaFromTypeDefs } from './schema-explore.js'

const schemaEntryForNugget = nugget => nugget.getIn(['schema', 'Data']).getFields();

// define typedef
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

//  a plain js value conforming to previously defined typeDefs
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

const value = Immutable.fromJS(valueJs);

// called when change detected on dataEgg
const cb = (nextValue, prevValue, keyPath) => {
  console.log('Value changed from', prevValue, 'to', nextValue, 'at', keyPath);
};

window.schema = schemaFromTypeDefs(typeDefs);
window.dataNugget = Immutable.Map({data:value, schema:schema});
window.dataEgg = select(dataNugget, ['0','scores'], cb);

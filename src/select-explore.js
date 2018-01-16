const graphql = require('graphql');
const graphqlTools = require('graphql-tools');
const Cursor = require('immutable-cursor');


const ScalarFactory = Immutable.Record({ name:"", kind: "SCALAR" });
const ObjectFactory = Immutable.Record({ name:"", kind: "OBJECT", getFields: null });
const ListFactory = Immutable.Record({ kind: "LIST", ofType:null });
const NonNullFactory = Immutable.Record( {kind: "NON_NULL", ofType:null });

// a set of immutable Type representations 
// which map to graphql types
export const Type = {
  // helper fn to create a new named scalar type
  // corresponds to GraphQLScalarType
  ScalarType: (name) => new ScalarFactory({name:name}),   
  StringType: new ScalarFactory({name:"String"}),         
  IntegerType: new ScalarFactory({name:"Int"}),
  FloatType: new ScalarFactory({name:"Float"}),
  BooleanType: new ScalarFactory({name:"Boolean"}),

  // helper fns to create composite types
  // corresponds to GraphQLObjectType
  ObjectType: (name, fieldFunc) => new ObjectFactory({name:name, getFields:fieldFunc}),
  // corresponds to GraphQLList
  ListType: (type) => new ListFactory({ofType:type}),
  // corresponds to GraphQLNonNull
  NonNullType: (type) => new NonNullFactory({ofType:type}),
};

const compose = (...functions) => data => functions.reduceRight((value, func) => func(value), data);

// prepare a "data-pipes" formatted typeDefs for gql schema parsing.
// gql schemas expect a "Query" or "Mutation" entry point:
// we simply rename entry point "Data" to "Query".
function adaptTypeDefsToGqlFormat(typeDefs){
  return  typeDefs.split(/\r?\n/)
          .map(line => line.replace(/(\s*type\s)Data/, "$1Query"))
          .join('\n');
}

// (typerDefs:string) => schema
// given a typedefs formatted string return a schema.
// the transformation is done in three steps:
// 1. 
// rename entry point to a valid gql entry point ('Data' -> 'Query').
// 2.
// parse typeDefs with the graphql tools.
// 3.
// simplify the schema and translate it to an immutable representation. 
export const schemaFromTypeDefs = compose(convertGqlSchemaToImmutable, 
                                          graphqlTools.buildSchemaFromTypeDefinitions, 
                                          adaptTypeDefsToGqlFormat);

// maps graphqlTypeName:string to functions with signature:
// graphqlType => immutableType:Record
const converters = {
  "GraphQLObjectType": type => {
    return Type.ObjectType(type.name, () => {
      let gqlFields = type.getFields();
      let fields = Immutable.Map();
      for(const key of Object.keys(gqlFields)){
        fields = fields.set(key, convertGqlTypeToImmutable(gqlFields[key].type));
      }
      return fields;
    });
  },
  "GraphQLScalarType": type => {
    switch(type.name){
      case "Boolean":
        return Type.BooleanType;
      case "String":
        return Type.StringType;
      case "Int":
        return Type.IntegerType;
      case "Float":
        return Type.FloatType;
      default:
        throw new Error("unsuported Scalar type " + type.name);
    }
  },
  "GraphQLList": type => {
    return Type.ListType(convertGqlTypeToImmutable(type.ofType));
  },
  "GraphQLNonNull": type => {
    return Type.NonNullType(convertGqlTypeToImmutable(type.ofType));
  },
};

// graphqlType => immutableType:Record
function convertGqlTypeToImmutable(type){
  if(!converters.hasOwnProperty(type.constructor.name)){
    console.log(type);
    throw new Error("unsuported type " + type.constructor.name);
  }
  return converters[type.constructor.name](type);
}

// given a gqlSchema return an immutable representation of its typeMap
function convertGqlSchemaToImmutable(gqlSchema){

  // 1 extract typemap property from gqlSchema and store it into an immutable map
  let result = Immutable.Map(gqlSchema._typeMap);
  // 2 remove unwanted extra properties
  result = result.delete("__Directive")
  .delete("__DirectiveLocation")
  .delete("__EnumValue")
  .delete("__Field")
  .delete("__InputValue")
  .delete("__Schema")
  .delete("__Type")
  .delete("__TypeKind")
  // 3 rename entry point "Query" to "Data"
  .set("Data", gqlSchema._typeMap.Query)
  .delete("Query");

  result.get("Data").name = "Data";
  result.get("Data")._typeConfig.name = "Data";

  // 4 convert js objects to immutable records
  result = result.map(convertGqlTypeToImmutable);

  return result;  
}

function gqlSubProp(type, prop){
  // console.log(type, prop);
  switch(type.kind){
    case "OBJECT":
      return type.getFields().get(prop);
      break;
    case "LIST":
      return type.ofType;
      break;
    default:
      throw new Error("Unsupported type " + type.kind);
  }
}

// given a schema and a path
// return new schema whose entry points to the path
function schemaSelect(schema, path){
  // start with root of given schema
  let prop = schema.get('Data').getFields().get('data');

  let propsInPath = path.slice();
  while(propsInPath.length > 0){
    let propName = propsInPath.shift();
    prop = gqlSubProp(prop, propName);
  }

  const Data = Type.ObjectType("Data", () => {
    let fields = Immutable.Map({data: prop});
    return fields;
  });

  // modify entry pointer of schema
  const result = schema.set("Data", Data);
  return result;
}

// Given a DataNugget, a path and a callback
// return a DataNugget/DataEgg representing the data at the given path.
// The data property is wrapped in an immutable cursor.
// The callback argument is passed to the cursor and signals its mutations.
// argument types: 
// path: [string]
// cb: (nextValue, prevValue, keyPath) => void
export function select(dataNugget, path, cb){
  return Immutable.Map({data: Cursor.from(dataNugget.get('data'), path, cb),
                        schema: schemaSelect(dataNugget.get('schema'), path)});
}

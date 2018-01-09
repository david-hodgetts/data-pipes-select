Salut Olivier, 

voici un premier retour sur l'exploration de la feature *select*. Il s'agit d'une vue d'ensemble: je te propose d'étudier les détails et le code dans un second temps.

# DataNugget mining avec *select*

Nous attendons de cette feature qu'elle permette de représenter un élément d'une valeur composite. C'est à dire que, donné un dataNugget et un *path* définissant l'accés à une sous-propriété, *select* devrait retourner un dataNugget représentant la valeur de la sous-propriété. Nous attendons également que le résultat de l'opération, le nouveau dataNugget, soit *smart* dans la mesure où il signale les mutations qu'il subit.

Avant d'explorer cette feature, il nous faut aboutir une première implémentation du dataNugget. Nous savons déjà la forme que prend la valeur, une structure immutable, il reste cependant à clarifier la forme du schéma.

## schéma

Pour réaliser cette première implémentation du schéma, nous avons décider d'exploiter au maximum l'infrastructure et le langage proposé par le projet graphQL.

Afin de faciliter la génération des schémas, la première opération qui nous intéresse consiste à transformer une représentation litérale, ou "typeDefs" dans le langage graphQL, en schéma structuré. 
Cette opération nous permettra d'explorer/tester la fonctionnalité *select* avec plus d'aisance.
Nous utilisons le parseur fournis par les graphql-tools pour accomplir cette tâche. 

Le résultat de cette transformation ne correspond malheureusement pas tout à fait à nos attentes. D'une part, le schéma natif GQL comprend des informations qui ne sont pas essentielles à notre usage, d'autres part, il ne se convertit pas naturellement en structure immutable (*Immutable.fromJS* ne fonctionne pas sur des objets comportant une chaîne de prototype complexe). 

Nous avons donc mis en place une seconde étape dans le processus. Cette seconde étape procéde à deux transformations. La première consiste à simplifier le schéma en effaçant toute les propriétés à l'exception du dictionnaire des types. La seconde consiste à substituer tous les éléments de ce dictionnaire par des "Records" Immutable.
Les types GQL suivants sont donc désormais representé par des records Immutable:
- GraphQLObjectType
- GraphQLScalarType
- GraphQLList
- GraphQLNonNull 

A noter, qu'il manque pour l'instant le support des Unions, Interfaces et Enumérations.
Nous estimons néanmoins que cette première implémentation est suffisante pour démarrer l'exploration de la feature "select".

## select 

Une première implémentation à été réalisée.
Elle prend la forme d'une fonction avec la signature suivante:

```
(dataNugget, path, callback) => smartDataNugget
// path:[string]
// callback:(nextValue, prevValue, keyPath) => void
```

Le résultat de l'opération se présente sous la forme d'un smart dataNugget.
Le smart dataNugget se distingue du *dumb* DataNugget en signalant les mutations appliqués à sa valeur. Concrétement, le callback fourni à *select* rend compte des mutations appliquées à la propriété *data*.

Pour implémenter cette fonctionalité, nous avons retenu le projet Immutable-Cursor. 
La propriété 'data' du smart nugget est donc emballée dans un *cursor*. 

Quand au schéma, il dérive directement du schéma parent avec la différence que le point d'entrée pointe désormais sur la valeur décrite par le path.

Finalement, signalons une contrainte des *cursors*: ils perdent leur réactivité quand il s'agit de représenter des valeurs scalaires. Un *cursor* ne réagit que sur des mutations effectuées sur un objet composite (Objet ou Liste). 
Dis-autrement, un *select* qui retourne une valeur scalaire ne pourra pas rendre compte des mutations appliquées au scalaire.
C'est peut-être un point à considérer pour la jonction entre les dataNuggets et les composants Polymer.




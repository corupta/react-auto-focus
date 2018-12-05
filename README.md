# React-Auto-Focus

## Especially useful for ReactNative

Hi, I started to think of a simpler way of handling `onSubmitEnd => focus next input` logic.

However, other implementations had limitations and performance problems.

I have started to create this module which uses React Context to find and subscribe children that have been passed through a high order function to register them to autofocus context.

Here is the initial documentation for the initial version (probably won't work, I've not tested yet)

## Example in React
```jsx harmony
import React from 'react';
import { withAutoFocus, AutoFocusContainer } from 'react-autofocus';
const handleKeyPress = (next, prev) => (e) => {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            prev();
        } else {
            next();
        }
    }
};
const Input = ({ next, prev, ...props }) => ( 
    <input {...props} onKeyPress={ handleKeyPress(next, prev) }/>
);
const CustomInput = withAutoFocus('focus', ['next'], ['prev'])(Input);
const Button = (props) => <button { ...props } />;
const CustomButton = withAutoFocus('click')(Button);
const Form = (props) => ( // prolly make it stateful in real life
    <AutoFocusContainer>
        <div>
            <label> Your Name: </label>
            <CustomInput type={"text"} autoFocusOrder={1} />
            <label> Your Surname: </label>
            <CustomInput type={"text"} autoFocusOrder={2} /> 
        </div>
        <label>
          Your Favorite Song
        </label>
        <CustomInput type={"text"} autoFocusOrder={3} />
        <CustomButton autoFocusOrder={ 100 }>
            Submit Survey
        </CustomButton>
    </AutoFocusContainer>
);
export default Form;
```

## Example in React Native

```jsx harmony
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { withAutoFocus, AutoFocusContainer } from 'react-autofocus';

const CustomInput = withAutoFocus('focus', ['onSubmitEditing'])(TextInput);

const CustomButton = withAutoFocus((elem) => elem.props.onPress)(TouchableOpacity); 

const Form = (props) => ( // prolly make it stateful in real life
      <AutoFocusContainer>
          <View>
              <Text> Your Name: </Text>
              <CustomInput autoFocusOrder={1} />
              <Text> Your Surname: </Text>
              <CustomInput autoFocusOrder={2} /> 
          </View>
          <Text>
            Your Favorite Song
          </Text>
          <CustomInput autoFocusOrder={3} />
          <CustomButton autoFocusOrder={ 100 }>
              Submit Survey
          </CustomButton>
      </AutoFocusContainer>
);
export default Form;
```

## Nesting Also Works BTW
```jsx harmony
import React from 'react';
import { withAutoFocus, AutoFocusContainer } from 'react-autofocus';
import { CustomInput, CustomButton, CustomLabel, CustomView } from './customs';

const Form = (props) => (
  <AutoFocusContainer>
    <CustomView>
      <CustomLabel>
        Your Name:
      </CustomLabel>
      <CustomInput autoFocusOrder={ 1 }/>
      <CustomLabel>
        Your Surname
      </CustomLabel>
      <CustomInput autoFocusOrder={ 2 }/>
    </CustomView>
    <CustomLabel>
      Your Favorite Song
    </CustomLabel>
    <CustomInput autoFocusOrder={ 3 } />
  </AutoFocusContainer>
);

// Assume that's the Form defined in above examples without submit button, however.

const MultiForms = (props) => ( // bulk 
  <AutoFocusContainer>
    <Form autoFocusOrder={ 1 } />
    <Form autoFocusOrder={ 2 } />
    <Form autoFocusOrder={ 3 } />
    <CustomButton autoFocusOrder={ 100 }>
      Submit All Surveys
    </CustomButton>
  </AutoFocusContainer>
);
export default MultiForms;
``` 


### withAutoFocus(focusExtractor, nextPropNames, prevPropNames)(Component);

A HOC to use a component with autofocus to it. 

Focus extractor can either be a string, (`focus = ref[focusExtractor]`)

or it can be a function, (`focus = focusExtractor(ref)`)

or it can be null (`focus = null`), 

(in that case, focusing into this element would result in skipping it and either focusing on next/previous one)


### AutoFocusContainer

Has props `next, prev, children, orderComperator = (a, b) => a - b, focusDefaultDirection = 'FORWARD'`

No need to provide anything, actually but if you want something like onSubmit behaviour without any buttons, you can add a function as the `next` prop, that'll be executed when the last focusable element calls its next method. (ex: pressed enter in the last input)

`prev` is similar to `next` but in reverse direction, run when previous function is triggered in first focusable element.

`children` is React Children :D

`orderComperator = (a, b) => a - b` compare function of AVL tree for ordering focusable components inside.

### AutoFocusableComponent = withAutoFocus()(Component)

AutoFocusableComponent expects a number `autoFocusOrder` to decide in which order the focusing should be handled.

These numbers must be unique within each AutoFocusContainer.

Limit is it should be between MIN_INT_SIZE/1000 and MAX_INT_SIZE/1000

In JS that means between -2^43 and 2^43 since all numbers are floating points.

So, feel free to use up to 12digits :D

There's an AVL tree in autoFocusContainer, handling the order with respect to these numbers.

If you do not supply `autoFocusOrder`, it will be experimentally guessed. (That might not be what you want.)


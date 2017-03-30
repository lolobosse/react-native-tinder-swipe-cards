/* Gratefully copied from https://github.com/brentvatne/react-native-animated-demo-tinder */
'use strict';

import React, {Component} from "react";
import {StyleSheet, Text, View, Animated, PanResponder, Dimensions, Image} from "react-native";
import clamp from "clamp";
import Defaults from "./Defaults.js";

const SWIPE_THRESHOLD = 120;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  yup: {
    borderColor: 'green',
    borderWidth: 2,
    position: 'absolute',
    padding: 20,
    bottom: 20,
    borderRadius: 5,
    right: 0,
  },
  yupText: {
    fontSize: 16,
    color: 'green',
  },
  maybe: {
    borderColor: 'blue',
    borderWidth: 2,
    position: 'absolute',
    padding: 20,
    bottom: 20,
    borderRadius: 5,
    right: 20,
  },
  maybeText: {
    fontSize: 16,
    color: 'blue',
  },
  nope: {
    borderColor: 'red',
    borderWidth: 2,
    position: 'absolute',
    bottom: 20,
    padding: 20,
    borderRadius: 5,
    left: 0,
  },
  nopeText: {
    fontSize: 16,
    color: 'red',
  },
  hintLayout: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  hintText: {
    marginTop: 20,
    fontSize: 16
  }
});

//Components could be unloaded and loaded and we will loose the users currentIndex, we can persist it here.
let currentIndex = {};
let guid = 0;

export default class SwipeCards extends Component {

  static propTypes = {
    cards: React.PropTypes.array,
    cardKey: React.PropTypes.string,
    hasMaybeAction: React.PropTypes.bool,
    loop: React.PropTypes.bool,
    onLoop: React.PropTypes.func,
    allowGestureTermination: React.PropTypes.bool,
    stack: React.PropTypes.bool,
    stackGuid: React.PropTypes.string,
    stackDepth: React.PropTypes.number,
    stackOffsetX: React.PropTypes.number,
    stackOffsetY: React.PropTypes.number,
    renderNoMoreCards: React.PropTypes.func,
    showYup: React.PropTypes.bool,
    showMaybe: React.PropTypes.bool,
    showNope: React.PropTypes.bool,
    handleYup: React.PropTypes.func,
    handleMaybe: React.PropTypes.func,
    handleNope: React.PropTypes.func,
    yupText: React.PropTypes.string,
    noText: React.PropTypes.string,
    onClickHandler: React.PropTypes.func,
    renderCard: React.PropTypes.func,
    cardRemoved: React.PropTypes.func,
    dragY: React.PropTypes.bool,
    smoothTransition: React.PropTypes.bool,
    offsetX: React.PropTypes.number,
    offsetY: React.PropTypes.number,
    containerWidth: React.PropTypes.number,
    cardWidth: React.PropTypes.number,
    cardHeight: React.PropTypes.number,
    dislikeHint: React.PropTypes.string,
    dislikePicture: React.PropTypes.number,
    likeHint: React.PropTypes.string,
    likePicture: React.PropTypes.number,
  };

  static defaultProps = {
    cards: [],
    cardKey: 'key',
    hasMaybeAction: false,
    loop: false,
    onLoop: () => null,
    allowGestureTermination: true,
    stack: false,
    stackDepth: 5,
    stackOffsetX: 25,
    stackOffsetY: 0,
    showYup: true,
    showMaybe: true,
    showNope: true,
    handleYup: (card) => null,
    handleMaybe: (card) => null,
    handleNope: (card) => null,
    nopeText: "Nope!",
    maybeText: "Maybe!",
    yupText: "Yup!",
    onClickHandler: () => {
      alert('tap')
    },
    onDragStart: () => {
    },
    onDragRelease: () => {
    },
    cardRemoved: (ix) => null,
    renderCard: (card) => null,
    style: styles.container,
    dragY: true,
    smoothTransition: false,
    offsetX: 0,
    offsetY: 0
  };

  constructor(props) {
    super(props);

    //Use a persistent variable to track currentIndex instead of a local one.
    this.guid = this.props.guid || guid++;
    if (!currentIndex[this.guid]) currentIndex[this.guid] = 0;

    this.state = {
      pan: new Animated.ValueXY(0),
      enter: new Animated.Value(0.5),
      cards: [].concat(this.props.cards),
      card: this.props.cards[currentIndex[this.guid]],
      isLike: true
    };

    this.lastX = 0;
    this.lastY = 0;

    this.cardAnimation = null;

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: (e, gestureState) => {
        this.props.onDragStart();
        this.lastX = gestureState.moveX;
        this.lastY = gestureState.moveY;
        return true;
      },
      onMoveShouldSetPanResponderCapture: (e, gestureState) => {
        if (Math.abs(gestureState.dx) < Math.abs(gestureState.dy)) return false;
        if ((gestureState.dx === 0) && (gestureState.dy === 0))   return false;
        return (Math.abs(this.lastX - gestureState.moveX) > 5 || Math.abs(this.lastY - gestureState.moveY) > 5);
      },

      onPanResponderGrant: (e, gestureState) => {
        this.state.pan.setOffset({x: this.state.pan.x._value, y: this.state.pan.y._value});
        this.state.pan.setValue({x: 0, y: 0});
        this.state.pan.x.addListener(({value}) => {
          if (value < -10 && this.state.isLike) {
            this.setState({isLike: false})
          }
          else if (value > 10 && !this.state.isLike) {
            this.setState({isLike: true})
          }
        });
      },

      onPanResponderTerminationRequest: (evt, gestureState) => this.props.allowGestureTermination,

      onPanResponderMove: Animated.event([
        null, {dx: this.state.pan.x, dy: this.props.dragY ? this.state.pan.y : 0},
      ]),

      onPanResponderRelease: (e, {vx, vy, dx, dy}) => {
        this.props.onDragRelease();
        this.state.pan.flattenOffset();
        let velocity;
        if (Math.abs(dx) <= 5 && Math.abs(dy) <= 5)   //meaning the gesture did not cover any distance
        {
          this.props.onClickHandler(this.state.card)
        }

        if (vx > 0) {
          velocity = clamp(vx, 3, 5);
        } else if (vx < 0) {
          velocity = clamp(vx * -1, 3, 5) * -1;
        } else {
          velocity = dx < 0 ? -3 : 3;
        }

        const hasSwipedHorizontally = Math.abs(this.state.pan.x._value) > SWIPE_THRESHOLD;
        const hasSwipedVertically = Math.abs(this.state.pan.y._value) > SWIPE_THRESHOLD;
        if (hasSwipedHorizontally || (hasSwipedVertically && this.props.hasMaybeAction)) {

          let cancelled = false;

          const hasMovedRight = hasSwipedHorizontally && this.state.pan.x._value > 0;
          const hasMovedLeft = hasSwipedHorizontally && this.state.pan.x._value < 0;
          const hasMovedUp = hasSwipedVertically && this.state.pan.y._value < 0;

          if (hasMovedRight) {
            cancelled = this.props.handleYup(this.state.card);
          } else if (hasMovedLeft) {
            cancelled = this.props.handleNope(this.state.card);
          } else if (hasMovedUp && this.props.hasMaybeAction) {
            cancelled = this.props.handleMaybe(this.state.card);
          } else {
            cancelled = true
          }

          //Yup or nope was cancelled, return the card to normal.
          if (cancelled) {
            this._resetPan();
            return;
          }

          this.props.cardRemoved(currentIndex[this.guid]);

          if (this.props.smoothTransition) {
            this._advanceState();
          } else {
            this.cardAnimation = Animated.decay(this.state.pan, {
              velocity: {x: velocity, y: vy},
              deceleration: 0.98
            });
            this.cardAnimation.start(status => {
                if (status.finished) this._advanceState();
                else this._resetState();

                this.cardAnimation = null;
              }
            );
          }

        } else {
          this._resetPan();
        }
      }
    });
  }

  _forceLeftSwipe() {
    this.cardAnimation = Animated.timing(this.state.pan, {
      toValue: {x: -500, y: 0},
    }).start(status => {
        if (status.finished) this._advanceState();
        else this._resetState();

        this.cardAnimation = null;
      }
    );
    this.setState({isLike: false});
    this.props.cardRemoved(currentIndex[this.guid]);
  }

  _forceUpSwipe() {
    this.cardAnimation = Animated.timing(this.state.pan, {
      toValue: {x: 0, y: 500},
    }).start(status => {
        if (status.finished) this._advanceState();
        else this._resetState();

        this.cardAnimation = null;
      }
    );
    this.props.cardRemoved(currentIndex[this.guid]);
  }

  _forceRightSwipe() {
    this.cardAnimation = Animated.timing(this.state.pan, {
      toValue: {x: 500, y: 0},
    }).start(status => {
        if (status.finished) this._advanceState();
        else this._resetState();

        this.cardAnimation = null;
      }
    );
    this.setState({isLike: true});
    this.props.cardRemoved(currentIndex[this.guid]);
  }

  _goToNextCard() {
    currentIndex[this.guid]++;

    // Checks to see if last card.
    // If props.loop=true, will start again from the first card.
    if (currentIndex[this.guid] > this.state.cards.length - 1 && this.props.loop) {
      this.props.onLoop();
      currentIndex[this.guid] = 0;
    }

    this.setState({
      card: this.state.cards[currentIndex[this.guid]]
    });
  }

  _goToPrevCard() {
    this.state.pan.setValue({x: 0, y: 0});
    this.state.enter.setValue(0);
    this._animateEntrance();

    currentIndex[this.guid]--;

    if (currentIndex[this.guid] < 0) {
      currentIndex[this.guid] = 0;
    }

    this.setState({
      card: this.state.cards[currentIndex[this.guid]]
    });
  }

  componentDidMount() {
    this._animateEntrance();
  }

  _animateEntrance() {
    Animated.spring(
      this.state.enter,
      {toValue: 1, friction: 8}
    ).start();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.cards !== this.props.cards) {

      if (this.cardAnimation) {
        this.cardAnimation.stop();
        this.cardAnimation = null;
      }

      currentIndex[this.guid] = 0;
      this.setState({
        cards: [].concat(nextProps.cards),
        card: nextProps.cards[0]
      });
    }
  }

  _resetPan() {
    Animated.spring(this.state.pan, {
      toValue: {x: 0, y: 0},
      friction: 4
    }).start();
  }

  _resetState() {
    this.state.pan.setValue({x: 0, y: 0});
    this.state.enter.setValue(0);
    this._animateEntrance();
  }

  _advanceState() {
    this.state.pan.setValue({x: 0, y: 0});
    this.state.enter.setValue(0);
    this._animateEntrance();
    this._goToNextCard();
  }

  /**
   * Returns current card object
   */
  getCurrentCard() {
    return this.state.cards[currentIndex[this.guid]];
  }

  renderNoMoreCards() {
    if (this.props.renderNoMoreCards) {
      return this.props.renderNoMoreCards();
    }

    return <Defaults.NoMoreCards />;
  }

  /**
   * Renders the cards as a stack with props.stackDepth cards deep.
   */
  renderStack() {
    if (!this.state.card) {
      return this.renderNoMoreCards();
    }

    //Get the next stack of cards to render.
    let cards = this.state.cards.slice(currentIndex[this.guid], currentIndex[this.guid] + this.props.stackDepth).reverse();

    return cards.map((card, i) => {

      let offsetX = this.props.offsetX;
      let lastOffsetX = offsetX + this.props.stackOffsetX;

      let offsetY = this.props.offsetY + this.props.stackOffsetY * cards.length - i * this.props.stackOffsetY;
      let lastOffsetY = offsetY + this.props.stackOffsetY;

      let opacity = 0.25 + (0.75 / cards.length) * (i + 1);
      let lastOpacity = 0.25 + (0.75 / cards.length) * i;

      let scale = 0.85 + (0.15 / cards.length) * (i + 1);
      let lastScale = 0.85 + (0.15 / cards.length) * i;

      let style = {
        position: 'absolute',
        top: this.state.enter.interpolate({inputRange: [0, 1], outputRange: [lastOffsetY, offsetY]}),
        left: this.state.enter.interpolate({inputRange: [0, 1], outputRange: [lastOffsetX, offsetX]}),
        transform: [{scale: this.state.enter.interpolate({inputRange: [0, 1], outputRange: [lastScale, scale]})}],
        elevation: i * 10
      };

      //Is this the top card?  If so animate it and hook up the pan handlers.
      if (i + 1 === cards.length) {
        let {pan} = this.state;
        let [translateX, translateY] = [pan.x, pan.y];

        let rotate = pan.x.interpolate({inputRange: [-200, 0, 200], outputRange: ["-30deg", "0deg", "30deg"]});
        let opacity = this.props.smoothTransition ? 1 : pan.x.interpolate({
            inputRange: [-200, 0, 200],
            outputRange: [0.5, 1, 0.5]
          });

        let animatedCardStyles = {
          ...style,
          transform: [
            {translateX: translateX},
            {translateY: translateY},
            {rotate: rotate},
            {scale: this.state.enter.interpolate({inputRange: [0, 1], outputRange: [lastScale, scale]})}
          ]
        };

        return <Animated.View key={card[this.props.cardKey]}
                              style={[styles.card, animatedCardStyles]} {... this._panResponder.panHandlers}>
          {this._renderCard()}
        </Animated.View>;
      }

      return <Animated.View key={card[this.props.cardKey]} style={style}>{this.props.renderCard(card)}</Animated.View>;
    });
  }

  renderCard() {
    if (!this.state.card) {
      return this.renderNoMoreCards();
    }

    let {pan, enter} = this.state;
    let [translateX, translateY] = [pan.x, pan.y];

    let rotate = pan.x.interpolate({inputRange: [-200, 0, 200], outputRange: ["-30deg", "0deg", "30deg"]});
    let opacity = pan.x.interpolate({inputRange: [-200, 0, 200], outputRange: [0.5, 1, 0.5]});

    let scale = enter;

    let animatedCardStyles = {transform: [{translateX}, {translateY}, {rotate}, {scale}], opacity};

    return <Animated.View key={"top"} style={[styles.card, animatedCardStyles]} {... this._panResponder.panHandlers}>
      {this.props.renderCard(this.state.card)}
    </Animated.View>;
  }

  _renderCard() {
    return (
      <View>
        {this.props.renderCard(this.state.card)}
        {this._renderApplyOrDislikeHint()}
      </View>

    )
  }

  _renderApplyOrDislikeHint() {
    let cardOpacity = {opacity: this.state.pan.x.interpolate({inputRange: [-80, -20, 0, 20, 80], outputRange: [0.9, 0, 0, 0, 0.9]})};
    let dimensionStyle = {
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#ddd',
      width: this.props.cardWidth,
      height: this.props.cardHeight,
      position: 'absolute'
    };
    return (
      <Animated.View style={[dimensionStyle, cardOpacity]}>
        {this.renderHint()}
      </Animated.View>
    )
  }

  renderHint() {
    return <View style={styles.hintLayout}>
      <Image source={this.state.isLike ? this.props.likePicture : this.props.dislikePicture}/>
      <Text style={styles.hintText}>
        {this.state.isLike ? this.props.likeHint : this.props.dislikeHint}
      </Text>
    </View>
  }

  render() {
    return (
      <View style={[{width: this.props.containerWidth}, styles.container]}>
        {this.props.stack ? this.renderStack() : this.renderCard()}
      </View>
    )
  }
}
